"""Infra comum dos geradores de relatório.

Cada gerador é uma função ``generate(ctx: ReportContext) -> GeneratedFile``.
A renderização por formato (XLSX / CSV / TXT / PDF) é compartilhada aqui — o
gerador só monta ``columns`` + ``rows`` (ou, no caso do painel de rendimento,
usa um builder próprio de PDF).
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from datetime import date

from core.exceptions import BusinessLogicError


@dataclass
class ReportScope:
    level: str  # network | school | class
    education_department_id: str | None = None
    school_id: str | None = None
    class_group_id: str | None = None
    title: str = ''


@dataclass
class ReportContext:
    execution: object
    scope: ReportScope
    params: dict = field(default_factory=dict)
    academic_year: object = None
    period: object = None


@dataclass
class GeneratedFile:
    content: bytes
    filename: str
    row_count: int


class ReportGenerationError(BusinessLogicError):
    """Erro de negócio na geração (dado incompleto). Vira status ERROR + error_details."""

    def __init__(self, code: str, message: str, failures: list | None = None):
        super().__init__(code=code, message=message)
        self.failures = failures or []


# --------------------------------------------------------------------------- #
#  Renderizadores por formato                                                  #
# --------------------------------------------------------------------------- #


def render_csv(columns: list[str], rows: list[list], *, delimiter: str = ';') -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=delimiter)
    writer.writerow(columns)
    for row in rows:
        writer.writerow(['' if v is None else v for v in row])
    return buf.getvalue().encode('utf-8-sig')


def render_txt(lines: list[str], *, encoding: str = 'latin-1') -> bytes:
    return ('\r\n'.join(lines) + '\r\n').encode(encoding, errors='replace')


def render_xlsx(sheet_title: str, columns: list[str], rows: list[list]) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    wb = Workbook(write_only=True)
    ws = wb.create_sheet(title=sheet_title[:31] or 'Relatório')
    bold = Font(bold=True)

    header = []
    for name in columns:
        from openpyxl.cell import WriteOnlyCell

        cell = WriteOnlyCell(ws, value=name)
        cell.font = bold
        header.append(cell)
    ws.append(header)
    for row in rows:
        ws.append(['' if v is None else v for v in row])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def render_table_pdf(
    title: str, subtitle: str, columns: list[str], rows: list[list], *, note: str = ''
) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4), topMargin=1.2 * cm, bottomMargin=1.2 * cm,
        leftMargin=1.2 * cm, rightMargin=1.2 * cm,
    )
    styles = getSampleStyleSheet()
    h = ParagraphStyle('h', parent=styles['Title'], fontSize=15, spaceAfter=4)
    sub = ParagraphStyle('sub', parent=styles['Normal'], fontSize=9, textColor=colors.grey)

    story = [Paragraph(title, h), Paragraph(subtitle, sub), Spacer(1, 0.4 * cm)]
    data = [columns] + [['' if v is None else str(v) for v in r] for r in rows]
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#d1d5db')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ])
    )
    story.append(table)
    if note:
        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph(note, sub))
    doc.build(story)
    return buf.getvalue()


# --------------------------------------------------------------------------- #
#  Helper de geração tabular (a maioria dos relatórios)                        #
# --------------------------------------------------------------------------- #


@dataclass
class TabularSpec:
    sheet_title: str
    pdf_title: str
    pdf_subtitle: str
    columns: list[str]
    rows: list[list]
    csv_delimiter: str = ';'
    pdf_note: str = ''


def render_tabular(spec: TabularSpec, output_format: str) -> bytes:
    fmt = output_format.upper()
    if fmt == 'XLSX':
        return render_xlsx(spec.sheet_title, spec.columns, spec.rows)
    if fmt == 'CSV':
        return render_csv(spec.columns, spec.rows, delimiter=spec.csv_delimiter)
    if fmt == 'PDF':
        return render_table_pdf(
            spec.pdf_title, spec.pdf_subtitle, spec.columns, spec.rows, note=spec.pdf_note
        )
    if fmt == 'TXT':
        lines = [spec.csv_delimiter.join(spec.columns)]
        lines += [spec.csv_delimiter.join('' if v is None else str(v) for v in r) for r in spec.rows]
        return render_txt(lines, encoding='utf-8')
    raise BusinessLogicError('INVALID_REPORT_PARAMS', f'Formato não suportado: {output_format}')


def ext_for(output_format: str) -> str:
    return {'PDF': 'pdf', 'XLSX': 'xlsx', 'CSV': 'csv', 'TXT': 'txt'}.get(output_format.upper(), 'bin')


def today_stamp() -> str:
    from django.utils import timezone

    return timezone.now().strftime('%Y%m%d-%H%M')


def _scope_slug(ctx: ReportContext) -> str:
    return (ctx.scope.title or ctx.scope.level or 'rede').lower().replace(' ', '-')[:40]


def build_filename(key: str, ctx: ReportContext, output_format: str) -> str:
    term = ctx.params.get('term') or (ctx.period.period_number if ctx.period else 'ano')
    import re

    slug = re.sub(r'[^a-z0-9-]', '', _scope_slug(ctx))
    return f"{key}-{slug}-{term}-{today_stamp()}.{ext_for(output_format)}"

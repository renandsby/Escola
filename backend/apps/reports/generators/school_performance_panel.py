"""Painel de rendimento por escola — a versão em arquivo do Dashboard Gerencial
(§5 do plano: é este relatório com ``include_charts=true`` que o botão
"Exportar painel (PDF)" dispara). Reusa o selector do dashboard.
"""

import io

from apps.dashboard.selectors.overview import get_dashboard_overview

from .base import GeneratedFile, ReportContext, TabularSpec, build_filename, render_tabular

KEY = 'school_performance_panel'


def _data(ctx: ReportContext) -> dict:
    return get_dashboard_overview(user=ctx.execution.requested_by, scope='network')


def generate(ctx: ReportContext) -> GeneratedFile:
    d = _data(ctx)
    fmt = ctx.execution.output_format.upper()
    kpis = d['kpis']
    period = d['period']

    kpi_rows = [
        ['Matrículas ativas', kpis['active_enrollments']['value']],
        ['Frequência média (%)', kpis['average_attendance']['value']],
        [f"Abaixo de {kpis['below_minimum_attendance'].get('threshold', 75)}%",
         kpis['below_minimum_attendance']['value']],
        ['Diário lançado (%)', kpis['diary_completeness']['value']],
        ['Transferências pendentes', kpis['pending_transfers']['value']],
    ]

    perf = d.get('performance') or {}
    perf_rows = [
        [s['label'], s['total'], f"{s['sufficient_pct']}%", f"{s['recovery_pct']}%", f"{s['at_risk_pct']}%"]
        for s in perf.get('numeric_stages', [])
    ]

    trend = d.get('attendance_trend') or {}
    trend_rows = []
    for serie in trend.get('series', []):
        for p in serie['points']:
            trend_rows.append([
                serie['label'], p['label'],
                '—' if p['value'] is None else f"{p['value']}%",
                'parcial' if p['partial'] else 'fechado',
            ])

    comp_rows = [
        [r['name'], r.get('inep', ''), r.get('classes', ''),
         '—' if r['grades_launched_pct'] is None else f"{r['grades_launched_pct']}%",
         '—' if r.get('average_attendance') is None else f"{r['average_attendance']}%",
         r['status']]
        for r in d['diary_completeness']['rows']
    ]

    subtitle = (
        f"Rede municipal · ano letivo {period['academic_year']} · "
        f"{period.get('term_label') or 'período corrente'}"
    )

    if fmt == 'XLSX':
        content = _xlsx(kpi_rows, perf_rows, trend_rows, comp_rows)
        row_count = len(perf_rows) + len(comp_rows)
    else:  # PDF
        content = _pdf(ctx, subtitle, kpi_rows, perf_rows, trend_rows, comp_rows)
        row_count = len(comp_rows)

    return GeneratedFile(
        content=content, filename=build_filename(KEY, ctx, fmt), row_count=row_count
    )


def _xlsx(kpi_rows, perf_rows, trend_rows, comp_rows) -> bytes:
    from openpyxl import Workbook

    wb = Workbook(write_only=True)
    for title, cols, rows in [
        ('KPIs', ['Indicador', 'Valor'], kpi_rows),
        ('Rendimento', ['Etapa', 'Alunos', 'Suficiente', 'Recuperação', 'Risco'], perf_rows),
        ('Frequência', ['Série', 'Bimestre', 'Frequência', 'Situação'], trend_rows),
        ('Completude', ['Escola', 'INEP', 'Turmas', 'Notas', 'Freq.', 'Situação'], comp_rows),
    ]:
        ws = wb.create_sheet(title=title)
        ws.append(cols)
        for r in rows:
            ws.append(['' if v is None else v for v in r])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _pdf(ctx, subtitle, kpi_rows, perf_rows, trend_rows, comp_rows) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.4 * cm, bottomMargin=1.4 * cm)
    styles = getSampleStyleSheet()
    h = ParagraphStyle('h', parent=styles['Title'], fontSize=15, spaceAfter=2)
    sub = ParagraphStyle('s', parent=styles['Normal'], fontSize=9, textColor=colors.grey)
    h2 = ParagraphStyle('h2', parent=styles['Heading3'], fontSize=11, spaceBefore=12)

    def block(cols, rows):
        t = Table([cols] + [['' if v is None else str(v) for v in r] for r in rows], repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#d1d5db')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
        ]))
        return t

    story = [
        Paragraph('Painel de rendimento por escola', h),
        Paragraph(subtitle, sub),
        Paragraph('Indicadores da rede', h2), block(['Indicador', 'Valor'], kpi_rows),
        Paragraph('Rendimento por etapa', h2),
        block(['Etapa', 'Alunos', 'Suficiente', 'Recuperação', 'Risco'], perf_rows),
        Paragraph('Frequência média por bimestre', h2),
        block(['Série', 'Bimestre', 'Frequência', 'Situação'], trend_rows),
    ]
    if ctx.params.get('include_school_comparison', True):
        story += [
            Paragraph('Completude do diário — escolas mais atrasadas', h2),
            block(['Escola', 'INEP', 'Turmas', 'Notas', 'Freq.', 'Situação'], comp_rows),
        ]
    story += [Spacer(1, 0.4 * cm), Paragraph(
        'Linha de referência legal de frequência: 75%.', sub
    )]
    doc.build(story)
    return buf.getvalue()

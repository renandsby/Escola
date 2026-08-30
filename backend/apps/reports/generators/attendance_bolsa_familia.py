from django.db.models import Count, Q

from apps.students.models import EnrollmentStatus

from .base import GeneratedFile, ReportContext, TabularSpec, build_filename, render_tabular
from ._scope import attendance_for, scoped_enrollments

KEY = 'attendance_bolsa_familia'


def generate(ctx: ReportContext) -> GeneratedFile:
    enrollments = list(
        scoped_enrollments(ctx.scope, ctx.academic_year, status=EnrollmentStatus.ENROLLED)
    )
    # só alunos com NIS (proxy de beneficiário do Bolsa Família)
    enrollments = [e for e in enrollments if (e.student.nis_code or '').strip()]

    window = attendance_for(enrollments)
    if ctx.period is not None:
        window = window.filter(date__gte=ctx.period.start_date, date__lte=ctx.period.end_date)
    stats = {
        r['enrollment_id']: r
        for r in window.values('enrollment_id')
        .annotate(total=Count('id'), present=Count('id', filter=Q(status='PRESENT')))
        .order_by()
    }

    rows = []
    for e in sorted(enrollments, key=lambda e: e.student.full_name):
        s = stats.get(e.id, {'total': 0, 'present': 0})
        pct = round(s['present'] / s['total'] * 100, 1) if s['total'] else None
        rows.append([
            e.student.nis_code,
            e.student.full_name,
            e.student.unique_municipal_id,
            e.school_class.school.name,
            e.school_class.name,
            s['total'],
            s['present'],
            '' if pct is None else f'{pct}%',
            'OK' if (pct is not None and pct >= 75) else 'ABAIXO DE 75%',
        ])

    spec = TabularSpec(
        sheet_title='Bolsa Família',
        pdf_title='Frequência mensal — Programa Bolsa Família',
        pdf_subtitle=(
            f'{ctx.scope.title} · '
            f'{ctx.period.name if ctx.period else "ano letivo"} '
            f'{getattr(ctx.academic_year, "year", "")}'
        ),
        columns=[
            'NIS', 'Aluno', 'ID municipal', 'Escola', 'Turma',
            'Aulas', 'Presenças', 'Frequência', 'Situação',
        ],
        rows=rows,
        pdf_note='Layout de acompanhamento de condicionalidades (MEC/MDS).',
    )
    return GeneratedFile(
        content=render_tabular(spec, ctx.execution.output_format),
        filename=build_filename(KEY, ctx, ctx.execution.output_format),
        row_count=len(rows),
    )

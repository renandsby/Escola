from django.db.models import Count, Q

from apps.students.models import EnrollmentStatus

from .base import (
    GeneratedFile,
    ReportContext,
    ReportGenerationError,
    TabularSpec,
    build_filename,
    render_tabular,
)
from ._scope import attendance_for, grades_for, scoped_enrollments

KEY = 'class_report_card'


def generate(ctx: ReportContext) -> GeneratedFile:
    enrollments = list(
        scoped_enrollments(ctx.scope, ctx.academic_year, status=EnrollmentStatus.ENROLLED)
    )
    if not enrollments:
        raise ReportGenerationError(
            'VALIDATION_ERROR', 'Nenhuma matrícula ativa na turma selecionada.'
        )

    grades = grades_for(enrollments, ctx.period).select_related('subject')
    subjects = sorted({g.subject.name for g in grades})
    grade_map: dict = {}
    for g in grades:
        score = g.final_score if g.final_score is not None else g.score
        grade_map[(g.enrollment_id, g.subject.name)] = score

    absence_map = {
        r['enrollment_id']: r['faltas']
        for r in attendance_for(enrollments)
        .values('enrollment_id')
        .annotate(faltas=Count('id', filter=~Q(status='PRESENT')))
        .order_by()
    }

    columns = ['Aluno', 'ID municipal'] + subjects + ['Faltas', 'Situação']
    rows = []
    for e in sorted(enrollments, key=lambda e: e.student.full_name):
        row = [e.student.full_name, e.student.unique_municipal_id]
        for s in subjects:
            v = grade_map.get((e.id, s))
            row.append('' if v is None else f'{float(v):.1f}')
        row.append(absence_map.get(e.id, 0))
        row.append(e.get_status_display())
        rows.append(row)

    klass = enrollments[0].school_class
    spec = TabularSpec(
        sheet_title='Boletim',
        pdf_title='Boletim consolidado por turma',
        pdf_subtitle=(
            f'{klass.school.name} · {klass.name} · '
            f'{ctx.period.name if ctx.period else "ano letivo"} '
            f'{getattr(ctx.academic_year, "year", "")}'
        ),
        columns=columns,
        rows=rows,
        pdf_note='Documento sujeito à assinatura da direção da escola.',
    )
    return GeneratedFile(
        content=render_tabular(spec, ctx.execution.output_format),
        filename=build_filename(KEY, ctx, ctx.execution.output_format),
        row_count=len(rows),
    )

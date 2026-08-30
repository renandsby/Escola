from apps.students.models import EnrollmentStatus

from .base import GeneratedFile, ReportContext, TabularSpec, build_filename, render_tabular
from ._scope import attendance_rate_by_enrollment, scoped_enrollments

KEY = 'students_below_minimum'
THRESHOLD = 75.0


def generate(ctx: ReportContext) -> GeneratedFile:
    enrollments = list(
        scoped_enrollments(ctx.scope, ctx.academic_year, status=EnrollmentStatus.ENROLLED)
    )
    rates = attendance_rate_by_enrollment(enrollments)

    rows = []
    for e in enrollments:
        rate = rates.get(e.id)
        if rate is None or rate >= THRESHOLD:
            continue
        rows.append([
            e.student.full_name,
            e.student.unique_municipal_id,
            e.school_class.school.name,
            e.school_class.name,
            e.school_class.shift,
            f'{rate}%',
        ])
    rows.sort(key=lambda r: float(r[5].rstrip('%')))

    spec = TabularSpec(
        sheet_title='Abaixo de 75%',
        pdf_title='Alunos abaixo de 75% de frequência',
        pdf_subtitle=f'{ctx.scope.title} · ano letivo {getattr(ctx.academic_year, "year", "—")}',
        columns=['Aluno', 'ID municipal', 'Escola', 'Turma', 'Turno', 'Frequência'],
        rows=rows,
        pdf_note='Frequência acumulada no ano letivo. Risco de reprovação por frequência.',
    )
    return GeneratedFile(
        content=render_tabular(spec, ctx.execution.output_format),
        filename=build_filename(KEY, ctx, ctx.execution.output_format),
        row_count=len(rows),
    )

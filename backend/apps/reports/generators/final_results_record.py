from statistics import mean

from apps.students.models import EnrollmentStatus

from .base import GeneratedFile, ReportContext, TabularSpec, build_filename, render_tabular
from ._scope import attendance_rate_by_enrollment, grades_for, scoped_enrollments

KEY = 'final_results_record'


def generate(ctx: ReportContext) -> GeneratedFile:
    enrollments = list(scoped_enrollments(ctx.scope, ctx.academic_year, status=None))
    active = [e for e in enrollments if e.status != EnrollmentStatus.DROPOUT]

    grades = grades_for(active).select_related('subject')
    by_enr: dict = {}
    for g in grades:
        score = float(g.final_score if g.final_score is not None else g.score)
        by_enr.setdefault(g.enrollment_id, []).append(score)
    rates = attendance_rate_by_enrollment(active)

    rows = []
    for e in sorted(active, key=lambda e: (e.school_class.school.name, e.school_class.name, e.student.full_name)):
        avg = round(mean(by_enr[e.id]), 1) if by_enr.get(e.id) else None
        freq = rates.get(e.id)
        rows.append([
            e.school_class.school.name,
            e.school_class.name,
            e.student.full_name,
            e.student.unique_municipal_id,
            '' if avg is None else f'{avg:.1f}',
            '' if freq is None else f'{freq}%',
            e.get_status_display(),
        ])

    spec = TabularSpec(
        sheet_title='Ata',
        pdf_title='Ata de resultados finais',
        pdf_subtitle=f'{ctx.scope.title} · ano letivo {getattr(ctx.academic_year, "year", "—")}',
        columns=['Escola', 'Turma', 'Aluno', 'ID municipal', 'Média geral', 'Frequência', 'Resultado'],
        rows=rows,
        pdf_note='Documento oficial. Assinaturas da direção e da secretaria escolar.',
    )
    return GeneratedFile(
        content=render_tabular(spec, ctx.execution.output_format),
        filename=build_filename(KEY, ctx, ctx.execution.output_format),
        row_count=len(rows),
    )

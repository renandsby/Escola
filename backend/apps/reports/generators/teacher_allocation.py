from .base import GeneratedFile, ReportContext, TabularSpec, build_filename, render_tabular
from ._scope import scoped_allocations, scoped_classes

KEY = 'teacher_allocation'
_SHIFT = {'MORNING': 'Manhã', 'AFTERNOON': 'Tarde', 'FULL_TIME': 'Integral', 'NIGHT': 'Noite'}


def generate(ctx: ReportContext) -> GeneratedFile:
    allocations = list(scoped_allocations(ctx.scope, ctx.academic_year))
    regent_class_ids = {a.school_class_id for a in allocations if a.is_regent}
    all_class_ids = set(scoped_classes(ctx.scope, ctx.academic_year).values_list('id', flat=True))
    without_regent = all_class_ids - regent_class_ids

    rows = []
    for a in sorted(allocations, key=lambda a: (a.school_class.school.name, a.school_class.name)):
        rows.append([
            a.teacher_profile.user.get_full_name() or a.teacher_profile.registration_number,
            a.teacher_profile.registration_number,
            a.school_class.school.name,
            a.school_class.name,
            _SHIFT.get(a.school_class.shift, a.school_class.shift),
            'Regente' if a.is_regent else (a.subject.name if a.subject_id else '—'),
        ])

    note = (
        f'{len(without_regent)} turma(s) sem professor regente.'
        if without_regent
        else 'Todas as turmas do escopo têm regente definido.'
    )
    spec = TabularSpec(
        sheet_title='Lotação',
        pdf_title='Quadro de lotação de professores',
        pdf_subtitle=f'{ctx.scope.title} · ano letivo {getattr(ctx.academic_year, "year", "—")}',
        columns=['Professor', 'Matrícula funcional', 'Escola', 'Turma', 'Turno', 'Função / disciplina'],
        rows=rows,
        pdf_note=note,
    )
    return GeneratedFile(
        content=render_tabular(spec, ctx.execution.output_format),
        filename=build_filename(KEY, ctx, ctx.execution.output_format),
        row_count=len(rows),
    )

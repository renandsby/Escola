"""Exportação Educacenso — reaproveita as regras de layout do exportador atual
(``ReportViewSet.educacenso_export``); aqui só acrescenta a validação prévia de
campos obrigatórios e a auditoria via ``ReportExecution``.
"""

from .base import GeneratedFile, ReportContext, ReportGenerationError, build_filename, render_txt

KEY = 'educacenso_export'

_HEADER = [
    'CO_ENTIDADE', 'ID_ALUNO_MUNICIPAL', 'ID_INEP', 'NO_ALUNO', 'NU_CPF',
    'DT_NASCIMENTO', 'TP_SEXO', 'TP_COR_RACA', 'NO_MAE', 'NO_PAI', 'NU_NIS',
]
_REQUIRED = {
    'birth_date': 'Data de nascimento',
    'gender': 'Sexo',
    'race_color': 'Raça/cor',
    'mother_name': 'Nome da mãe',
}


def generate(ctx: ReportContext) -> GeneratedFile:
    from apps.reports.selectors.reports import get_department_schools, get_department_students

    dept_id = ctx.scope.education_department_id
    if not dept_id:
        raise ReportGenerationError('SCOPE_FORBIDDEN', 'Educacenso é exclusivo do escopo de rede.')

    schools = {str(s.id): s.inep_code or '' for s in get_department_schools(dept_id)}
    students = list(
        get_department_students(dept_id).prefetch_related('enrollments__school_class__school')
    )

    failures = []
    lines = [';'.join(_HEADER)]
    for student in students:
        missing = [
            label for field, label in _REQUIRED.items() if not getattr(student, field, None)
        ]
        if missing:
            failures.append({
                'student': student.full_name,
                'unique_municipal_id': student.unique_municipal_id,
                'missing_fields': missing,
            })
            continue
        enrollment = student.enrollments.filter(deleted_at__isnull=True).first()
        co_entidade = ''
        if enrollment:
            co_entidade = schools.get(str(enrollment.school_class.school_id), '')
        lines.append(';'.join([
            co_entidade,
            student.unique_municipal_id,
            student.inep_id or '',
            student.full_name,
            student.cpf or '',
            student.birth_date.isoformat() if student.birth_date else '',
            student.gender or '',
            student.race_color or '',
            student.mother_name,
            student.father_name or '',
            student.nis_code or '',
        ]))

    if failures:
        raise ReportGenerationError(
            'EDUCACENSO_VALIDATION_FAILED',
            f'{len(failures)} aluno(s) com campos obrigatórios ausentes para o Educacenso.',
            failures=failures,
        )

    return GeneratedFile(
        content=render_txt(lines, encoding='latin-1'),
        filename=build_filename(KEY, ctx, 'TXT'),
        row_count=len(lines) - 1,
    )

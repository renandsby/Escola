"""Motor de validação e exportação do Educacenso (P2-EDUCACENSO).

- ``validate_network_for_educacenso`` — diagnóstico de pendências cadastrais
  impeditivas em escolas, turmas, docentes e alunos.
- ``generate_educacenso_archive`` — ZIP UTF-8 com ``escolas.csv``,
  ``turmas.csv``, ``docentes.csv`` e ``matriculas.csv`` (separador ``;``).
"""

from __future__ import annotations

import csv
import io
import zipfile

from apps.classes.models import SchoolClass, TeacherAllocation, TeacherProfile
from apps.schools.models import School
from apps.students.models import Enrollment, EnrollmentStatus, Student

CSV_DELIMITER = ';'


def _rows_to_csv(header: list[str], rows: list[list]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=CSV_DELIMITER)
    writer.writerow(header)
    writer.writerows(rows)
    return buffer.getvalue()


def validate_network_for_educacenso(*, department_id) -> dict:
    """Sumário de consistência. ``blocking`` lista pendências impeditivas."""
    issues: list[dict] = []

    schools = School.objects.filter(
        education_department_id=department_id, deleted_at__isnull=True
    )
    for school in schools:
        missing = [
            label
            for label, value in (
                ('código INEP', school.inep_code),
                ('cidade', school.address_city),
                ('UF', school.address_state),
            )
            if not value
        ]
        if missing:
            issues.append(
                {
                    'entity': 'escola',
                    'id': str(school.id),
                    'label': school.name,
                    'missing': missing,
                }
            )

    classes = SchoolClass.objects.filter(
        school__education_department_id=department_id, deleted_at__isnull=True
    ).select_related('school')
    for klass in classes:
        if not klass.school.inep_code:
            issues.append(
                {
                    'entity': 'turma',
                    'id': str(klass.id),
                    'label': f'{klass.name} — {klass.school.name}',
                    'missing': ['escola sem código INEP'],
                }
            )

    allocated_profile_ids = (
        TeacherAllocation.objects.filter(
            school_class__school__education_department_id=department_id
        )
        .values_list('teacher_profile_id', flat=True)
        .distinct()
    )
    for profile in TeacherProfile.objects.filter(
        id__in=allocated_profile_ids
    ).select_related('user'):
        missing = [
            label
            for label, value in (
                ('CPF', profile.cpf),
                ('data de nascimento', profile.birth_date),
            )
            if not value
        ]
        if missing:
            issues.append(
                {
                    'entity': 'docente',
                    'id': str(profile.id),
                    'label': profile.user.get_full_name() or profile.registration_number,
                    'missing': missing,
                }
            )

    students = Student.objects.filter(
        education_department_id=department_id,
        deleted_at__isnull=True,
        enrollments__status=EnrollmentStatus.ENROLLED,
        enrollments__deleted_at__isnull=True,
    ).distinct()
    for student in students:
        missing = [
            label
            for label, value in (
                ('data de nascimento', student.birth_date),
                ('sexo', student.gender),
                ('raça/cor', student.race_color),
                ('nome da mãe', student.mother_name),
                ('CPF ou certidão', student.cpf or student.birth_certificate),
            )
            if not value
        ]
        if missing:
            issues.append(
                {
                    'entity': 'aluno',
                    'id': str(student.id),
                    'label': f'{student.full_name} ({student.unique_municipal_id})',
                    'missing': missing,
                }
            )

    by_entity: dict[str, int] = {}
    for issue in issues:
        by_entity[issue['entity']] = by_entity.get(issue['entity'], 0) + 1

    return {
        'department_id': str(department_id),
        'schools': schools.count(),
        'classes': classes.count(),
        'students': students.count(),
        'blocking_count': len(issues),
        'by_entity': by_entity,
        'blocking': issues[:500],
        'ready': len(issues) == 0,
    }


def generate_educacenso_archive(*, department_id, academic_year_id=None) -> bytes:
    schools = list(
        School.objects.filter(
            education_department_id=department_id, deleted_at__isnull=True
        ).order_by('name')
    )
    escolas_csv = _rows_to_csv(
        ['CO_ENTIDADE', 'NO_ENTIDADE', 'CNPJ', 'NO_MUNICIPIO', 'SG_UF', 'CO_CEP', 'DS_ENDERECO'],
        [
            [
                s.inep_code or '',
                s.name,
                s.cnpj or '',
                s.address_city,
                s.address_state,
                s.address_zip_code,
                f'{s.address_street}, {s.address_number} - {s.address_neighborhood}'.strip(' ,-'),
            ]
            for s in schools
        ],
    )

    classes_qs = SchoolClass.objects.filter(
        school__education_department_id=department_id, deleted_at__isnull=True
    ).select_related('school', 'academic_year')
    if academic_year_id:
        classes_qs = classes_qs.filter(academic_year_id=academic_year_id)
    turmas_csv = _rows_to_csv(
        ['CO_ENTIDADE', 'CO_TURMA', 'NO_TURMA', 'TP_TURNO', 'NU_CAPACIDADE', 'NU_ANO'],
        [
            [
                k.school.inep_code or '',
                k.inep_class_code or str(k.id),
                k.name,
                k.shift,
                k.max_capacity,
                getattr(k.academic_year, 'year', ''),
            ]
            for k in classes_qs.order_by('school__name', 'name')
        ],
    )

    allocations = (
        TeacherAllocation.objects.filter(
            school_class__school__education_department_id=department_id
        )
        .select_related('teacher_profile__user', 'school_class__school')
        .order_by('teacher_profile__user__first_name')
    )
    docentes_csv = _rows_to_csv(
        ['CO_ENTIDADE', 'CO_DOCENTE', 'NO_DOCENTE', 'NU_CPF', 'DT_NASCIMENTO', 'DS_FORMACAO'],
        [
            [
                a.school_class.school.inep_code or '',
                a.teacher_profile.registration_number,
                a.teacher_profile.user.get_full_name(),
                a.teacher_profile.cpf or '',
                a.teacher_profile.birth_date.isoformat() if a.teacher_profile.birth_date else '',
                a.teacher_profile.formation_area or '',
            ]
            for a in allocations
        ],
    )

    enr_qs = (
        Enrollment.objects.filter(
            school_class__school__education_department_id=department_id,
            deleted_at__isnull=True,
        )
        .select_related('student', 'school_class__school', 'school_class__academic_year')
    )
    if academic_year_id:
        enr_qs = enr_qs.filter(school_class__academic_year_id=academic_year_id)
    matriculas_csv = _rows_to_csv(
        [
            'CO_ENTIDADE', 'CO_TURMA', 'ID_ALUNO_MUNICIPAL', 'ID_INEP', 'NO_ALUNO',
            'NU_CPF', 'DT_NASCIMENTO', 'TP_SEXO', 'TP_COR_RACA', 'NO_MAE', 'NO_PAI',
            'NU_NIS', 'ST_MATRICULA',
        ],
        [
            [
                e.school_class.school.inep_code or '',
                e.school_class.inep_class_code or str(e.school_class_id),
                e.student.unique_municipal_id,
                e.student.inep_id or '',
                e.student.full_name,
                e.student.cpf or '',
                e.student.birth_date.isoformat() if e.student.birth_date else '',
                e.student.gender or '',
                e.student.race_color or '',
                e.student.mother_name,
                e.student.father_name or '',
                e.student.nis_code or '',
                e.status,
            ]
            for e in enr_qs.order_by('school_class__school__name', 'student__full_name')
        ],
    )

    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('escolas.csv', escolas_csv.encode('utf-8-sig'))
        archive.writestr('turmas.csv', turmas_csv.encode('utf-8-sig'))
        archive.writestr('docentes.csv', docentes_csv.encode('utf-8-sig'))
        archive.writestr('matriculas.csv', matriculas_csv.encode('utf-8-sig'))
    return out.getvalue()

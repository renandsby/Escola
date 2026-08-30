"""P2-EDUCACENSO — validação e exportação em ZIP."""

import io
import zipfile

import pytest
from rest_framework.test import APIClient

from apps.reports.services.educacenso_exporter import (
    generate_educacenso_archive,
    validate_network_for_educacenso,
)
from apps.students.tests.factories import (
    EnrollmentFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
)

pytestmark = pytest.mark.django_db

VALIDATE = '/api/v1/reports/educacenso/validate/'
EXPORT = '/api/v1/reports/educacenso/export/'


def _network_with_gap():
    school = SchoolFactory(inep_code='')  # pendência impeditiva
    klass = SchoolClassFactory(school=school)
    student = StudentFactory(
        education_department=school.education_department, mother_name=''
    )
    EnrollmentFactory(student=student, school_class=klass)
    return school, klass, student


def test_validate_flags_missing_inep_and_student_fields():
    school, _, student = _network_with_gap()
    summary = validate_network_for_educacenso(department_id=school.education_department_id)

    assert summary['ready'] is False
    labels = {i['entity'] for i in summary['blocking']}
    assert 'escola' in labels
    assert 'aluno' in labels


def test_validate_ready_when_complete():
    school = SchoolFactory(inep_code='35999999')
    klass = SchoolClassFactory(school=school)
    student = StudentFactory(
        education_department=school.education_department,
        race_color='Parda',
        gender='F',
        cpf='98765432100',
    )
    EnrollmentFactory(student=student, school_class=klass)

    summary = validate_network_for_educacenso(
        department_id=school.education_department_id
    )
    assert all(i['entity'] != 'aluno' for i in summary['blocking'])


def test_archive_has_four_utf8_csvs():
    enrollment = EnrollmentFactory()
    enrollment.school_class.school.inep_code = '35123456'
    enrollment.school_class.school.save(update_fields=['inep_code'])
    dept_id = enrollment.school_class.school.education_department_id

    content = generate_educacenso_archive(department_id=dept_id)
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        names = set(zf.namelist())
        assert names == {'escolas.csv', 'turmas.csv', 'docentes.csv', 'matriculas.csv'}
        matriculas = zf.read('matriculas.csv').decode('utf-8-sig')
        assert 'ID_ALUNO_MUNICIPAL' in matriculas
        assert ';' in matriculas.splitlines()[0]


def test_endpoints_forbidden_for_school_director():
    school = SchoolFactory()
    director = SchoolDirectorFactory(school=school, education_department=None)
    client = APIClient()
    client.force_authenticate(director)

    assert client.get(VALIDATE).status_code == 403
    assert client.get(EXPORT).status_code == 403


def test_sme_admin_downloads_zip():
    enrollment = EnrollmentFactory()
    dept = enrollment.school_class.school.education_department
    admin = SMEAdminFactory(education_department=dept)
    client = APIClient()
    client.force_authenticate(admin)

    resp = client.get(EXPORT)
    assert resp.status_code == 200
    assert resp['Content-Type'] == 'application/zip'

"""Testes de selectors e endpoints do domínio de relatórios."""

import pytest
from rest_framework.test import APIClient

from apps.class_diary.tests.factories import (
    EducationDepartmentFactory,
    EnrollmentFactory,
    SchoolDirectorFactory,
    StudentFactory,
    StudentGuardianUserFactory,
)
from apps.reports.selectors.reports import (
    get_department_students,
    get_student_by_user,
    get_students_for_school,
    resolve_report_student,
)
from core.exceptions import BusinessLogicError


@pytest.mark.django_db
class TestReportSelectors:
    def test_get_student_by_user(self):
        user = StudentGuardianUserFactory()
        student = StudentFactory(user=user, education_department=user.education_department)

        assert get_student_by_user(user).pk == student.pk

    def test_get_students_for_school(self):
        enrollment = EnrollmentFactory()
        school_id = enrollment.school_class.school_id

        ids = set(get_students_for_school(school_id).values_list('id', flat=True))

        assert enrollment.student_id in ids

    def test_get_department_students_ordered(self):
        dept = EducationDepartmentFactory()
        StudentFactory(education_department=dept, unique_municipal_id='MUN0002')
        StudentFactory(education_department=dept, unique_municipal_id='MUN0001')

        ids_order = list(
            get_department_students(dept.id).values_list('unique_municipal_id', flat=True)
        )

        assert ids_order == sorted(ids_order)


@pytest.mark.django_db
class TestReportEndpoints:
    def test_boletim_pdf_404_without_student_profile(self):
        user = StudentGuardianUserFactory()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get('/api/v1/reports/boletim_pdf/')

        assert response.status_code == 404

    def test_manager_emits_boletim_for_scoped_student(self):
        enrollment = EnrollmentFactory()
        director = SchoolDirectorFactory(
            education_department=None, school=enrollment.school_class.school
        )
        client = APIClient()
        client.force_authenticate(director)

        response = client.get(
            '/api/v1/reports/boletim_pdf/', {'student_id': str(enrollment.student_id)}
        )
        assert response.status_code == 200
        assert response['Content-Type'] == 'application/pdf'

    def test_manager_cannot_emit_for_out_of_scope_student(self):
        enrollment = EnrollmentFactory()
        outsider_student = StudentFactory()
        director = SchoolDirectorFactory(
            education_department=None, school=enrollment.school_class.school
        )
        client = APIClient()
        client.force_authenticate(director)

        response = client.get(
            '/api/v1/reports/boletim_pdf/', {'student_id': str(outsider_student.id)}
        )
        assert response.status_code == 403

    def test_educacenso_export_streams_csv(self):
        dept = EducationDepartmentFactory()
        StudentFactory(education_department=dept)
        user = StudentGuardianUserFactory(education_department=dept)
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get('/api/v1/reports/educacenso-export/')

        assert response.status_code == 200
        assert response['Content-Type'].startswith('text/csv')

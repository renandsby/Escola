"""Testes de integração dos endpoints do app consolidado apps.class_diary."""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.class_diary.models import Attendance, Grade
from apps.class_diary.tests.factories import (
    AcademicPeriodFactory,
    AttendanceFactory,
    DescriptiveEvaluationFactory,
    DiaryEntryFactory,
    EducationDepartmentFactory,
    EnrollmentFactory,
    GradeFactory,
    SchoolClassFactory,
    SchoolHistoryFactory,
    SMEAdminFactory,
    StudentFactory,
    SubjectFactory,
    TeacherProfileFactory,
    TeacherUserFactory,
)


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestDiaryEntryAPI:
    def test_list_requires_authentication(self):
        response = _client().get(reverse('diary-entry-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_sme_admin_can_list_entries(self):
        department = EducationDepartmentFactory()
        DiaryEntryFactory(school_class__school__education_department=department)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).get(reverse('diary-entry-list'))

        assert response.status_code == status.HTTP_200_OK

    def test_teacher_can_create_entry(self):
        department = EducationDepartmentFactory()
        teacher_user = TeacherUserFactory(education_department=department)
        teacher_profile = TeacherProfileFactory(user=teacher_user, education_department=department)
        school_class = SchoolClassFactory(school__education_department=department)
        subject = SubjectFactory(education_department=department)
        payload = {
            'school_class': str(school_class.id),
            'subject': str(subject.id),
            'teacher': str(teacher_profile.id),
            'content': 'Conteúdo da aula de hoje',
        }

        response = _client(teacher_user).post(reverse('diary-entry-list'), payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestGradeAPI:
    def test_list_requires_authentication(self):
        response = _client().get(reverse('grade-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_sme_admin_can_list_grades(self):
        department = EducationDepartmentFactory()
        GradeFactory(enrollment__student__education_department=department)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).get(reverse('grade-list'))

        assert response.status_code == status.HTTP_200_OK

    def test_student_query_param_filters_by_student(self):
        department = EducationDepartmentFactory()
        student = StudentFactory(education_department=department)
        enrollment = EnrollmentFactory(student=student)
        matching_grade = GradeFactory(enrollment=enrollment)
        GradeFactory(enrollment__student__education_department=department)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).get(reverse('grade-list'), {'student': str(student.id)})

        assert response.status_code == status.HTTP_200_OK
        ids = {item['id'] for item in response.data.get('results', response.data)}
        assert str(matching_grade.id) in ids

    def test_batch_upsert_creates_and_updates(self):
        department = EducationDepartmentFactory()
        admin = SMEAdminFactory(education_department=department)
        existing_grade = GradeFactory(enrollment__student__education_department=department, score=Decimal('5.00'))
        subject = SubjectFactory(education_department=department)
        period = AcademicPeriodFactory()
        new_enrollment = EnrollmentFactory(student__education_department=department)

        # 'teacher' é omitido de propósito: o serializer o declara como UUIDField,
        # mas core.User usa PK inteira — o batch-upsert cobre esse caso usando o
        # id do usuário autenticado como fallback (teacher é opcional).
        payload = [
            {
                'enrollment': str(existing_grade.enrollment_id),
                'subject': str(existing_grade.subject_id),
                'academic_period': str(existing_grade.academic_period_id),
                'score': '9.00',
            },
            {
                'enrollment': str(new_enrollment.id),
                'subject': str(subject.id),
                'academic_period': str(period.id),
                'score': '7.00',
            },
        ]

        response = _client(admin).post(
            reverse('grade-batch-upsert'),
            payload,
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK, response.data
        assert len(response.data['results']) == 2
        assert Grade.objects.count() == 2
        existing_grade.refresh_from_db()
        assert existing_grade.score == Decimal('9.00')


@pytest.mark.django_db
class TestAttendanceAPI:
    def test_list_requires_authentication(self):
        response = _client().get(reverse('attendance-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_sme_admin_can_list_attendance(self):
        department = EducationDepartmentFactory()
        AttendanceFactory(enrollment__student__education_department=department)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).get(reverse('attendance-list'))

        assert response.status_code == status.HTTP_200_OK

    def test_batch_upsert_creates_and_updates(self):
        department = EducationDepartmentFactory()
        admin = SMEAdminFactory(education_department=department)
        existing = AttendanceFactory(enrollment__student__education_department=department, status='PRESENT')
        new_enrollment = EnrollmentFactory(student__education_department=department)

        payload = [
            {
                'enrollment': str(existing.enrollment_id),
                'school_class': str(existing.school_class_id),
                'subject': None,
                'date': str(existing.date),
                'status': 'ABSENT',
            },
            {
                'enrollment': str(new_enrollment.id),
                'school_class': str(new_enrollment.school_class_id),
                'subject': None,
                'date': str(existing.date),
                'status': 'PRESENT',
            },
        ]

        response = _client(admin).post(
            reverse('attendance-batch-upsert'),
            payload,
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
        assert Attendance.objects.count() == 2
        existing.refresh_from_db()
        assert existing.status == 'ABSENT'


@pytest.mark.django_db
class TestDescriptiveEvaluationAPI:
    def test_list_requires_authentication(self):
        response = _client().get(reverse('descriptive-evaluation-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_sme_admin_can_list_evaluations(self):
        department = EducationDepartmentFactory()
        DescriptiveEvaluationFactory(enrollment__student__education_department=department)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).get(reverse('descriptive-evaluation-list'))

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestSchoolHistoryAPI:
    def test_list_requires_authentication(self):
        response = _client().get(reverse('school-history-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_can_list(self):
        SchoolHistoryFactory()
        admin = SMEAdminFactory()

        response = _client(admin).get(reverse('school-history-list'))

        assert response.status_code == status.HTTP_200_OK

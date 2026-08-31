"""Testes de integração dos endpoints do app consolidado apps.students."""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.governance.models import ConsentRecord, ConsentType
from core.validators import generate_cpf
from apps.students.models import EnrollmentStatus, TransferRequestStatus
from apps.students.tests.factories import (
    EducationDepartmentFactory,
    EnrollmentFactory,
    GuardianFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    StudentGuardianFactory,
    StudentGuardianUserFactory,
    TeacherUserFactory,
    TransferRequestFactory,
)


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


def _grant_enrollment_consent(student):
    return ConsentRecord.objects.create(
        student=student,
        consent_type=ConsentType.ENROLLMENT_DATA_USE,
        granted=True,
    )


@pytest.mark.django_db
class TestStudentAPI:
    def test_list_requires_authentication(self):
        response = _client().get(reverse('student-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_sme_admin_can_list_students(self):
        department = EducationDepartmentFactory()
        StudentFactory(education_department=department)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).get(reverse('student-list'))

        assert response.status_code == status.HTTP_200_OK

    def test_sme_admin_can_create_student(self):
        department = EducationDepartmentFactory()
        admin = SMEAdminFactory(education_department=department)
        payload = {
            'education_department': str(department.id),
            'unique_municipal_id': 'MUN99999999',
            'cpf': generate_cpf(30001),
            'full_name': 'Novo Aluno',
            'mother_name': 'Mãe do Aluno',
            'birth_date': '2016-05-10',
            'lgpd_consent': True,
        }

        response = _client(admin).post(reverse('student-list'), payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED

    def test_create_student_without_lgpd_consent_is_rejected(self):
        department = EducationDepartmentFactory()
        admin = SMEAdminFactory(education_department=department)
        payload = {
            'education_department': str(department.id),
            'unique_municipal_id': 'MUN77777777',
            'cpf': generate_cpf(30002),
            'full_name': 'Aluno Sem LGPD',
            'mother_name': 'Mãe',
            'birth_date': '2016-05-10',
        }

        response = _client(admin).post(reverse('student-list'), payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'LGPD_CONSENT_REQUIRED'

    def test_teacher_cannot_create_student(self):
        department = EducationDepartmentFactory()
        teacher = TeacherUserFactory(education_department=department)
        payload = {
            'education_department': str(department.id),
            'unique_municipal_id': 'MUN88888888',
            'full_name': 'Outro Aluno',
            'mother_name': 'Mãe',
            'birth_date': '2016-05-10',
        }

        response = _client(teacher).post(reverse('student-list'), payload, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_soft_delete_returns_204(self):
        department = EducationDepartmentFactory()
        student = StudentFactory(education_department=department)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).delete(reverse('student-detail', kwargs={'pk': student.pk}))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        student.refresh_from_db()
        assert student.deleted_at is not None

    def test_academic_history_action(self):
        department = EducationDepartmentFactory()
        student = StudentFactory(education_department=department)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).get(
            reverse('student-academic-history', kwargs={'pk': student.pk})
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'enrollments' in response.data
        assert 'grades' in response.data
        assert 'attendances' in response.data


@pytest.mark.django_db
class TestGuardianAPI:
    def test_list_requires_authentication(self):
        response = _client().get(reverse('guardian-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_sme_admin_sees_linked_guardians(self):
        department = EducationDepartmentFactory()
        student = StudentFactory(education_department=department)
        guardian = GuardianFactory()
        StudentGuardianFactory(student=student, guardian=guardian)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).get(reverse('guardian-list'))

        assert response.status_code == status.HTTP_200_OK
        ids = {item['id'] for item in response.data.get('results', response.data)}
        assert str(guardian.id) in ids


@pytest.mark.django_db
class TestStudentGuardianLinkAPI:
    def test_create_link(self):
        department = EducationDepartmentFactory()
        student = StudentFactory(education_department=department)
        guardian = GuardianFactory()
        admin = SMEAdminFactory(education_department=department)
        payload = {
            'student': str(student.id),
            'guardian': str(guardian.id),
            'kinship_type': 'MOTHER',
            'is_emergency_contact': True,
        }

        response = _client(admin).post(reverse('student-guardian-list'), payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestEnrollmentAPI:
    def test_list_requires_authentication(self):
        response = _client().get(reverse('enrollment-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_enrollment_success(self):
        department = EducationDepartmentFactory()
        student = StudentFactory(education_department=department)
        _grant_enrollment_consent(student)
        school_class = SchoolClassFactory(school__education_department=department, max_capacity=10)
        admin = SMEAdminFactory(education_department=department)
        payload = {
            'student': str(student.id),
            'school_class': str(school_class.id),
        }

        response = _client(admin).post(reverse('enrollment-list'), payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == EnrollmentStatus.ENROLLED

    def test_create_enrollment_duplicate_returns_business_error(self):
        department = EducationDepartmentFactory()
        first_enrollment = EnrollmentFactory(student__education_department=department)
        student = first_enrollment.student
        _grant_enrollment_consent(student)
        other_class = SchoolClassFactory(
            school__education_department=department,
            academic_year=first_enrollment.school_class.academic_year,
        )
        admin = SMEAdminFactory(education_department=department)
        payload = {
            'student': str(student.id),
            'school_class': str(other_class.id),
        }

        response = _client(admin).post(reverse('enrollment-list'), payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'DUPLICATE_ENROLLMENT'

    def test_create_enrollment_capacity_exceeded_returns_business_error(self):
        department = EducationDepartmentFactory()
        school_class = SchoolClassFactory(school__education_department=department, max_capacity=1)
        EnrollmentFactory(school_class=school_class, student__education_department=department)
        new_student = StudentFactory(education_department=department)
        _grant_enrollment_consent(new_student)
        admin = SMEAdminFactory(education_department=department)
        payload = {
            'student': str(new_student.id),
            'school_class': str(school_class.id),
        }

        response = _client(admin).post(reverse('enrollment-list'), payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'CLASS_CAPACITY_EXCEEDED'


@pytest.mark.django_db
class TestTransferRequestAPI:
    def test_list_requires_authentication(self):
        response = _client().get(reverse('transfer-request-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_sme_staff_can_authorize(self):
        department = EducationDepartmentFactory()
        transfer = TransferRequestFactory(
            student__education_department=department,
            status=TransferRequestStatus.PENDING_SME,
        )
        destination = SchoolFactory(education_department=department)
        admin = SMEAdminFactory(education_department=department)

        response = _client(admin).patch(
            reverse('transfer-request-authorize', kwargs={'pk': transfer.pk}),
            {'destination_school': str(destination.id)},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == TransferRequestStatus.APPROVED_BY_SME

    def test_non_sme_staff_cannot_authorize(self):
        department = EducationDepartmentFactory()
        transfer = TransferRequestFactory(
            student__education_department=department,
            status=TransferRequestStatus.PENDING_SME,
        )
        teacher = TeacherUserFactory(education_department=department)

        response = _client(teacher).patch(
            reverse('transfer-request-authorize', kwargs={'pk': transfer.pk}),
        )

        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_school_staff_can_accept(self):
        destination = SchoolFactory()
        transfer = TransferRequestFactory(
            status=TransferRequestStatus.APPROVED_BY_SME,
            destination_school=destination,
        )
        director = SchoolDirectorFactory(
            school=destination,
            education_department=destination.education_department,
        )

        response = _client(director).patch(
            reverse('transfer-request-accept', kwargs={'pk': transfer.pk}),
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == TransferRequestStatus.ACCEPTED_BY_DESTINATION

    def test_non_school_staff_cannot_accept(self):
        destination = SchoolFactory()
        transfer = TransferRequestFactory(
            status=TransferRequestStatus.APPROVED_BY_SME,
            destination_school=destination,
        )
        student_user = StudentGuardianUserFactory(education_department=destination.education_department)

        response = _client(student_user).patch(
            reverse('transfer-request-accept', kwargs={'pk': transfer.pk}),
        )

        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_accept_wrong_status_returns_business_error(self):
        destination = SchoolFactory()
        transfer = TransferRequestFactory(
            status=TransferRequestStatus.PENDING_SME,
            destination_school=destination,
        )
        director = SchoolDirectorFactory(
            school=destination,
            education_department=destination.education_department,
        )

        response = _client(director).patch(
            reverse('transfer-request-accept', kwargs={'pk': transfer.pk}),
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'INVALID_STATUS_TRANSITION'

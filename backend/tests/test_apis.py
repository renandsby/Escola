"""Testes críticos de API do domínio SME."""

import pytest
from django.urls import reverse
from rest_framework import status

from apps.schools.models import School
from core.models import UserRole


@pytest.mark.django_db
class TestAuthenticationAPI:
    def test_login_returns_sme_admin_role(self, api_client, admin_user):
        url = reverse('login')
        response = api_client.post(
            url,
            {'username': 'admin', 'password': 'testpass123'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert response.data['user']['role'] == UserRole.SME_ADMIN

    def test_login_invalid_credentials(self, api_client, admin_user):
        url = reverse('login')
        response = api_client.post(
            url,
            {'username': 'admin', 'password': 'wrong'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestSchoolPermissions:
    def test_student_cannot_post_schools(self, student_client, department):
        url = reverse('school-list')
        response = student_client.post(
            url,
            {
                'education_department': str(department.pk),
                'name': 'Escola Intrusa',
                'school_type': 'CRECHE',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_soft_delete_school_returns_204(self, admin_client, school):
        url = reverse('school-detail', kwargs={'pk': school.pk})
        response = admin_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        school.refresh_from_db()
        assert school.deleted_at is not None
        assert School.objects.filter(pk=school.pk).exists()


@pytest.mark.django_db
class TestGradePermissionsAndScope:
    def test_student_cannot_patch_grades(self, student_client, grade):
        url = reverse('grade-detail', kwargs={'pk': grade.pk})
        response = student_client.patch(url, {'score': '10.00'}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_student_only_sees_own_grades(
        self, student_client, grade, other_grade, student
    ):
        url = reverse('grade-list')
        response = student_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        ids = {str(item['id']) for item in results}
        assert str(grade.pk) in ids
        assert str(other_grade.pk) not in ids

    def test_student_filter_on_grades(self, admin_client, grade, other_grade, student):
        url = reverse('grade-list')
        response = admin_client.get(url, {'student': str(student.pk)})
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) >= 1
        for item in results:
            # list serializer includes enrollment; filter must exclude other student
            assert str(item['id']) != str(other_grade.pk) or item.get('enrollment') == str(
                grade.enrollment_id
            )
        ids = {str(item['id']) for item in results}
        assert str(grade.pk) in ids
        assert str(other_grade.pk) not in ids


@pytest.mark.django_db
class TestTeacherClassScope:
    def test_teacher_only_sees_allocated_classes(
        self, teacher_client, school_class, school_class_b, teacher_allocation
    ):
        url = reverse('class-list')
        response = teacher_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        ids = {str(item['id']) for item in results}
        assert str(school_class.pk) in ids
        assert str(school_class_b.pk) not in ids


@pytest.mark.django_db
class TestSMEEndpoints:
    def test_departments_accessible_to_sme_admin(self, admin_client, department):
        url = reverse('sme-department-list')
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        ids = {str(item['id']) for item in results}
        assert str(department.pk) in ids

    def test_departments_forbidden_to_student(self, student_client, department):
        url = reverse('sme-department-list')
        response = student_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

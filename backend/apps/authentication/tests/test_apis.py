"""Integração dos endpoints /api/v1/accounts/ (prefixo congelado)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.governance.tests.factories import EducationDepartmentFactory

from .factories import SMEAdminFactory, TeacherUserFactory, UserFactory


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestLogin:
    def test_login_with_cpf(self):
        user = UserFactory(email='cpf.login@example.com')
        user.set_password('secret123')
        user.save()

        response = APIClient().post(
            '/api/v1/accounts/login/',
            {'identifier': user.cpf, 'password': 'secret123'},
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert response.data['user']['cpf'] == user.cpf

    def test_login_with_email_case_insensitive(self):
        user = UserFactory(email='Person.Login@Example.com')
        user.set_password('secret123')
        user.save()

        response = APIClient().post(
            '/api/v1/accounts/login/',
            {'identifier': 'PERSON.login@example.COM', 'password': 'secret123'},
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_login_rejects_bad_credentials(self):
        response = APIClient().post(
            '/api/v1/accounts/login/',
            {'username': 'nope', 'password': 'nope'},
        )
        assert response.status_code in (
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
        )


@pytest.mark.django_db
class TestUsersEndpoint:
    def test_me_returns_current_user(self):
        user = UserFactory()
        response = _client(user).get('/api/v1/accounts/users/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == user.username

    def test_list_scoped_to_department_for_sme_admin(self):
        dept = EducationDepartmentFactory()
        UserFactory(education_department=dept)
        UserFactory(education_department=EducationDepartmentFactory())
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get('/api/v1/accounts/users/')

        assert response.status_code == status.HTTP_200_OK
        returned_depts = {str(row['education_department']) for row in response.data['results']}
        assert returned_depts <= {str(dept.id)}

    def test_permissions_endpoint_requires_admin(self):
        teacher = TeacherUserFactory()
        response = _client(teacher).get('/api/v1/accounts/permissions/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

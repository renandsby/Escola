"""P2-USERS-UI — gestão administrativa de usuários pela SME."""

import pytest
from rest_framework.test import APIClient

from apps.governance.tests.factories import EducationDepartmentFactory
from core.models import User, UserRole
from .factories import SMEAdminFactory, TeacherUserFactory, UserFactory

pytestmark = pytest.mark.django_db

CREATE = '/api/v1/accounts/users/create_user/'


def _admin_client():
    dept = EducationDepartmentFactory()
    admin = SMEAdminFactory(education_department=dept)
    client = APIClient()
    client.force_authenticate(admin)
    return client, dept


def _payload(dept, **over):
    base = {
        'username': 'diretor.novo',
        'email': 'diretor.novo@rede.gov.br',
        'first_name': 'Ana',
        'last_name': 'Gestora',
        'role': UserRole.SME_SUPERVISOR,
        'password': 'provisoria-123',
        'password_confirm': 'provisoria-123',
        'education_department': str(dept.id),
    }
    base.update(over)
    return base


def test_admin_creates_network_user():
    client, dept = _admin_client()
    resp = client.post(CREATE, _payload(dept), format='json')
    assert resp.status_code == 201, resp.data
    assert User.objects.filter(username='diretor.novo', role=UserRole.SME_SUPERVISOR).exists()


def test_duplicate_email_returns_friendly_error():
    client, dept = _admin_client()
    UserFactory(email='dup@rede.gov.br')
    resp = client.post(CREATE, _payload(dept, email='dup@rede.gov.br'), format='json')
    assert resp.status_code == 400
    body = resp.data
    detail = body['error']['details'] if 'error' in body else body
    assert 'email' in detail


def test_duplicate_document_returns_friendly_error():
    client, dept = _admin_client()
    UserFactory(document='12345678901')
    resp = client.post(CREATE, _payload(dept, document='12345678901'), format='json')
    assert resp.status_code == 400
    detail = resp.data['error']['details'] if 'error' in resp.data else resp.data
    assert 'document' in detail


def test_non_admin_cannot_create_user():
    client = APIClient()
    client.force_authenticate(TeacherUserFactory())
    resp = client.post(CREATE, {'username': 'x', 'email': 'x@x.com'}, format='json')
    assert resp.status_code == 403


def test_deactivation_blocks_authenticated_requests():
    client, dept = _admin_client()
    target = UserFactory(education_department=dept)

    resp = client.patch(f'/api/v1/accounts/users/{target.id}/', {'is_active': False}, format='json')
    assert resp.status_code == 200
    target.refresh_from_db()
    assert target.is_active is False

    # o alvo agora não consegue mais autenticar via JWT
    from rest_framework_simplejwt.tokens import AccessToken

    token = AccessToken.for_user(target)
    victim = APIClient()
    victim.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    assert victim.get('/api/v1/accounts/users/me/').status_code == 401


def test_admin_list_includes_inactive_users():
    client, dept = _admin_client()
    UserFactory(education_department=dept, is_active=False, username='inativo')
    resp = client.get('/api/v1/accounts/users/', {'page_size': 200})
    usernames = {u['username'] for u in resp.data['results']}
    assert 'inativo' in usernames

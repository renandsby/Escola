"""P2-USERS-UI — gestão administrativa de usuários pela SME."""

import pytest
from rest_framework.test import APIClient

from apps.governance.tests.factories import EducationDepartmentFactory
from core.models import User, UserRole
from core.validators import generate_cpf
from .factories import SMEAdminFactory, TeacherUserFactory, UserFactory

pytestmark = pytest.mark.django_db

CREATE = '/api/v1/accounts/users/create_user/'

CPF_A = generate_cpf(1_001)
CPF_B = generate_cpf(1_002)


def _admin_client():
    dept = EducationDepartmentFactory()
    admin = SMEAdminFactory(education_department=dept)
    client = APIClient()
    client.force_authenticate(admin)
    return client, dept


def _payload(dept, **over):
    base = {
        'cpf': CPF_A,
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
    user = User.objects.get(cpf=CPF_A)
    assert user.role == UserRole.SME_SUPERVISOR
    # o username interno espelha o CPF
    assert user.username == CPF_A


def test_create_user_requires_cpf():
    client, dept = _admin_client()
    payload = _payload(dept)
    payload.pop('cpf')
    resp = client.post(CREATE, payload, format='json')
    assert resp.status_code == 400


def test_duplicate_email_returns_friendly_error():
    client, dept = _admin_client()
    UserFactory(email='dup@rede.gov.br')
    resp = client.post(CREATE, _payload(dept, email='dup@rede.gov.br'), format='json')
    assert resp.status_code == 400
    body = resp.data
    detail = body['error']['details'] if 'error' in body else body
    assert 'email' in detail


def test_duplicate_cpf_returns_friendly_error():
    client, dept = _admin_client()
    UserFactory(cpf=CPF_B)
    resp = client.post(CREATE, _payload(dept, cpf=CPF_B), format='json')
    assert resp.status_code == 400
    detail = resp.data['error']['details'] if 'error' in resp.data else resp.data
    assert 'cpf' in detail


def test_non_admin_cannot_create_user():
    client = APIClient()
    client.force_authenticate(TeacherUserFactory())
    resp = client.post(CREATE, {'cpf': generate_cpf(9), 'email': 'x@x.com'}, format='json')
    assert resp.status_code == 403


def test_deactivation_blocks_authenticated_requests():
    client, dept = _admin_client()
    target = UserFactory(education_department=dept)

    resp = client.patch(f'/api/v1/accounts/users/{target.id}/', {'is_active': False}, format='json')
    assert resp.status_code == 200
    target.refresh_from_db()
    assert target.is_active is False

    from rest_framework_simplejwt.tokens import AccessToken

    token = AccessToken.for_user(target)
    victim = APIClient()
    victim.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    assert victim.get('/api/v1/accounts/users/me/').status_code == 401


def test_admin_list_includes_inactive_users():
    client, dept = _admin_client()
    inactive = UserFactory(education_department=dept, is_active=False)
    resp = client.get('/api/v1/accounts/users/', {'page_size': 200})
    ids = {str(u['id']) for u in resp.data['results']}
    assert str(inactive.id) in ids

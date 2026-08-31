"""Auto-cadastro de responsável + verificação de e-mail (DX-SGE-006)."""

from datetime import date

import pytest
from rest_framework.test import APIClient

from core.exceptions import BusinessLogicError
from core.models import User, UserRole
from core.validators import generate_cpf
from apps.authentication.models import EmailVerification
from apps.authentication.services import email_verification_service
from apps.students.models import Guardian, GuardianLinkStatus, StudentGuardian
from apps.students.services.guardian_service import self_register_guardian

from .factories import (
    EducationDepartmentFactory,
    GuardianFactory,
    SMEAdminFactory,
    StudentFactory,
    StudentGuardianFactory,
)

pytestmark = pytest.mark.django_db

SELF_REGISTER = '/api/v1/guardians/self-register/'


def _payload(**over):
    base = {
        'full_name': 'Maria Auto Cadastro',
        'cpf': generate_cpf(70_001),
        'email': 'maria.auto@example.com',
        'phone': '(81) 99999-0000',
        'password': 'senhaForte123',
        'password_confirm': 'senhaForte123',
    }
    base.update(over)
    return base


class TestSelfRegisterService:
    def test_creates_user_and_guardian(self):
        result = self_register_guardian(
            full_name='João Silva',
            cpf='529.982.247-25',
            email='Joao@Example.com',
            password='senha12345',
            phone='(81) 98888-0000',
        )
        assert result['user'].cpf == '52998224725'
        assert result['user'].username == '52998224725'
        assert result['user'].email == 'joao@example.com'
        assert result['user'].role == UserRole.STUDENT_GUARDIAN
        assert result['guardian'].user_id == result['user'].id
        assert EmailVerification.objects.filter(user=result['user'], verified=False).exists()

    def test_reuses_existing_guardian_without_account(self):
        dept = EducationDepartmentFactory()
        cpf = generate_cpf(70_010)
        guardian = Guardian.objects.create(full_name='Pré Cadastrado', cpf=cpf, phone='x')
        assert guardian.user_id is None

        result = self_register_guardian(
            full_name='Pré Cadastrado', cpf=cpf, email='pre@example.com',
            password='senha12345', phone='(81) 97777-0000',
        )
        guardian.refresh_from_db()
        assert guardian.user_id == result['user'].id
        assert Guardian.objects.filter(cpf=cpf).count() == 1

    def test_rejects_duplicate_cpf(self):
        cpf = generate_cpf(70_020)
        User.objects.create_user(username=cpf, cpf=cpf, email='a@a.com', password='x')
        with pytest.raises(BusinessLogicError) as exc:
            self_register_guardian(full_name='X', cpf=cpf, email='b@b.com',
                                   password='senha12345', phone='y')
        assert exc.value.code == 'CPF_ALREADY_REGISTERED'

    def test_rejects_duplicate_email(self):
        User.objects.create_user(username=generate_cpf(70_030), cpf=generate_cpf(70_030),
                                 email='dup@example.com', password='x')
        with pytest.raises(BusinessLogicError) as exc:
            self_register_guardian(full_name='X', cpf=generate_cpf(70_031),
                                   email='DUP@example.com', password='senha12345', phone='y')
        assert exc.value.code == 'EMAIL_ALREADY_REGISTERED'


class TestSelfRegisterAPI:
    def test_success_returns_tokens(self):
        resp = APIClient().post(SELF_REGISTER, _payload(), format='json')
        assert resp.status_code == 201, resp.data
        assert 'access' in resp.data and 'refresh' in resp.data
        assert resp.data['user']['role'] == 'student_guardian'
        assert resp.data['user']['email_verified'] is False
        assert resp.data['email_verification_required'] is True

    def test_password_mismatch(self):
        resp = APIClient().post(SELF_REGISTER, _payload(password_confirm='outra12345'), format='json')
        assert resp.status_code == 400

    def test_invalid_cpf(self):
        resp = APIClient().post(SELF_REGISTER, _payload(cpf='12345678900'), format='json')
        assert resp.status_code == 400


class TestEmailVerificationGate:
    def test_unverified_guardian_blocked_from_my_dependents(self):
        result = self_register_guardian(
            full_name='Bloq', cpf=generate_cpf(70_040), email='bloq@example.com',
            password='senha12345', phone='z',
        )
        client = APIClient()
        client.force_authenticate(result['user'])
        resp = client.get('/api/v1/guardians/my-dependents/')
        assert resp.status_code == 403

        email_verification_service.confirm(
            raw_token=_raw_token_for(result['user'])
        )
        resp = client.get('/api/v1/guardians/my-dependents/')
        assert resp.status_code == 200

    def test_staff_and_legacy_guardians_pass_through(self):
        # sem EmailVerification → grandfathered
        link = StudentGuardianFactory()
        client = APIClient()
        client.force_authenticate(link.guardian.user)
        assert client.get('/api/v1/guardians/my-dependents/').status_code == 200

    def test_confirm_rejects_bad_token(self):
        with pytest.raises(BusinessLogicError):
            email_verification_service.confirm(raw_token='nope')


def _raw_token_for(user):
    """Recria um token cru válido (o teste não recebe o token do e-mail)."""
    import hashlib
    import secrets

    from django.utils import timezone

    raw = secrets.token_urlsafe(16)
    EmailVerification.objects.filter(user=user).update(
        token=hashlib.sha256(raw.encode()).hexdigest(),
        expires_at=timezone.now() + timezone.timedelta(days=1),
        verified=False,
    )
    return raw


def test_staff_link_creation_is_confirmed_and_guardian_write_is_blocked():
    dept = EducationDepartmentFactory()
    student = StudentFactory(education_department=dept)
    guardian = GuardianFactory()
    admin = SMEAdminFactory(education_department=dept)

    staff = APIClient()
    staff.force_authenticate(admin)
    resp = staff.post(
        '/api/v1/guardians/links/',
        {'student': str(student.id), 'guardian': str(guardian.id),
         'kinship_type': 'MOTHER', 'is_emergency_contact': True},
        format='json',
    )
    assert resp.status_code == 201, resp.data
    link = StudentGuardian.objects.get(id=resp.data['id'])
    assert link.status == GuardianLinkStatus.CONFIRMED
    assert link.verification_method == 'STAFF_CREATED'

    # responsável NÃO pode criar vínculo direto
    gclient = APIClient()
    gclient.force_authenticate(guardian.user)
    resp = gclient.post(
        '/api/v1/guardians/links/',
        {'student': str(StudentFactory().id), 'guardian': str(guardian.id),
         'kinship_type': 'MOTHER'},
        format='json',
    )
    assert resp.status_code == 403

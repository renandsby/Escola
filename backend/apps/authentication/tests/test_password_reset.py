"""P2-PWDRESET — recuperação de senha."""

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import PasswordReset
from apps.authentication.services.password_reset_service import (
    confirm_password_reset,
    request_password_reset,
)
from apps.authentication.tests.factories import UserFactory
from core.exceptions import BusinessLogicError

pytestmark = pytest.mark.django_db

REQ = '/api/v1/accounts/password-reset/request/'
CONFIRM = '/api/v1/accounts/password-reset/confirm/'


def test_request_unknown_identifier_returns_generic_success():
    client = APIClient()
    resp = client.post(REQ, {'email_or_username': 'ninguem@nada.com'}, format='json')
    assert resp.status_code == 200
    assert PasswordReset.objects.count() == 0
    assert len(mail.outbox) == 0


def test_request_known_user_creates_token_and_sends_mail():
    user = UserFactory(email='prof@rede.gov.br')
    client = APIClient()
    resp = client.post(REQ, {'email_or_username': 'prof@rede.gov.br'}, format='json')
    assert resp.status_code == 200
    reset = PasswordReset.objects.get(user=user)
    assert reset.used is False
    assert len(mail.outbox) == 1
    assert 'redefinir-senha' in mail.outbox[0].body


def test_confirm_resets_password_and_consumes_token():
    user = UserFactory()
    request_password_reset(email_or_username=user.username)
    # recupera o token cru do link no e-mail
    raw = mail.outbox[0].body.split('/redefinir-senha/')[1].split()[0]

    client = APIClient()
    resp = client.post(
        CONFIRM,
        {'token': raw, 'new_password': 'nova-senha-99', 'new_password_confirm': 'nova-senha-99'},
        format='json',
    )
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.check_password('nova-senha-99')
    assert PasswordReset.objects.get(user=user).used is True


def test_confirm_rejects_reused_token():
    user = UserFactory()
    request_password_reset(email_or_username=user.username)
    raw = mail.outbox[0].body.split('/redefinir-senha/')[1].split()[0]
    confirm_password_reset(token=raw, new_password='primeira-vez-1')

    with pytest.raises(BusinessLogicError) as exc:
        confirm_password_reset(token=raw, new_password='segunda-vez-2')
    assert exc.value.code == 'INVALID_RESET_TOKEN'


def test_confirm_rejects_expired_token():
    user = UserFactory()
    request_password_reset(email_or_username=user.username)
    raw = mail.outbox[0].body.split('/redefinir-senha/')[1].split()[0]
    PasswordReset.objects.filter(user=user).update(
        expires_at=timezone.now() - timezone.timedelta(minutes=1)
    )
    with pytest.raises(BusinessLogicError) as exc:
        confirm_password_reset(token=raw, new_password='qualquer-coisa-3')
    assert exc.value.code == 'EXPIRED_RESET_TOKEN'


def test_new_request_invalidates_previous_open_token():
    user = UserFactory()
    request_password_reset(email_or_username=user.username)
    first_raw = mail.outbox[0].body.split('/redefinir-senha/')[1].split()[0]
    request_password_reset(email_or_username=user.username)

    with pytest.raises(BusinessLogicError):
        confirm_password_reset(token=first_raw, new_password='ainda-nao-4')

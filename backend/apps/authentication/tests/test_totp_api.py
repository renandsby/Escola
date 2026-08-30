"""2FA/TOTP — testes de API e do fluxo de login em dois passos."""

import pyotp
import pytest
from rest_framework.test import APIClient

from apps.authentication.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

LOGIN = '/api/v1/accounts/login/'
ENABLE = '/api/v1/accounts/totp/enable/'
CONFIRM = '/api/v1/accounts/totp/confirm/'
STATUS = '/api/v1/accounts/totp/status/'
DISABLE = '/api/v1/accounts/totp/disable/'
VERIFY = '/api/v1/accounts/totp/verify/'


def _user_with_password(pwd='segredo-123'):
    user = UserFactory()
    user.set_password(pwd)
    user.save()
    return user, pwd


def _enable_2fa(client) -> str:
    """Ativa e confirma o 2FA para o usuário autenticado no client; devolve o secret."""
    secret = client.post(ENABLE).data['secret']
    resp = client.post(CONFIRM, {'code': pyotp.TOTP(secret).now()}, format='json')
    assert resp.status_code == 200
    return secret


class TestEnableConfirmStatus:
    def test_enable_requires_auth(self):
        assert APIClient().post(ENABLE).status_code == 401

    def test_enable_then_confirm_then_status(self):
        user, _ = _user_with_password()
        client = APIClient()
        client.force_authenticate(user)

        enable = client.post(ENABLE)
        assert enable.status_code == 201
        assert enable.data['qr_code'].startswith('data:image/png;base64,')

        confirm = client.post(CONFIRM, {'code': pyotp.TOTP(enable.data['secret']).now()}, format='json')
        assert confirm.status_code == 200
        assert len(confirm.data['backup_codes']) == 8

        status_resp = client.get(STATUS)
        assert status_resp.data['enabled'] is True
        assert status_resp.data['confirmed_at'] is not None
        assert status_resp.data['backup_codes_remaining'] == 8

    def test_confirm_with_invalid_code_is_400(self):
        user, _ = _user_with_password()
        client = APIClient()
        client.force_authenticate(user)
        client.post(ENABLE)
        assert client.post(CONFIRM, {'code': '000000'}, format='json').status_code == 400

    def test_status_disabled_by_default(self):
        client = APIClient()
        client.force_authenticate(UserFactory())
        resp = client.get(STATUS)
        assert resp.data == {'enabled': False, 'confirmed_at': None, 'backup_codes_remaining': 0}


class TestLoginFlow:
    def test_login_without_2fa_returns_tokens(self):
        user, pwd = _user_with_password()
        resp = APIClient().post(LOGIN, {'username': user.username, 'password': pwd}, format='json')
        assert resp.status_code == 200
        assert resp.data['requires_2fa'] is False
        assert 'access' in resp.data and 'refresh' in resp.data

    def test_login_with_2fa_returns_only_challenge(self):
        user, pwd = _user_with_password()
        client = APIClient()
        client.force_authenticate(user)
        _enable_2fa(client)
        client.logout()

        resp = client.post(LOGIN, {'username': user.username, 'password': pwd}, format='json')
        assert resp.status_code == 200
        assert resp.data['requires_2fa'] is True
        assert 'challenge_token' in resp.data
        assert 'access' not in resp.data and 'refresh' not in resp.data

    def test_verify_with_valid_totp_completes_login(self):
        user, pwd = _user_with_password()
        client = APIClient()
        client.force_authenticate(user)
        secret = _enable_2fa(client)
        client.logout()

        challenge = client.post(
            LOGIN, {'username': user.username, 'password': pwd}, format='json'
        ).data['challenge_token']

        resp = client.post(
            VERIFY, {'challenge_token': challenge, 'code': pyotp.TOTP(secret).now()}, format='json'
        )
        assert resp.status_code == 200
        assert resp.data['access'] and resp.data['refresh']
        assert resp.data['user']['username'] == user.username

    def test_verify_with_backup_code_completes_login(self):
        user, pwd = _user_with_password()
        client = APIClient()
        client.force_authenticate(user)
        secret = client.post(ENABLE).data['secret']
        codes = client.post(CONFIRM, {'code': pyotp.TOTP(secret).now()}, format='json').data['backup_codes']
        client.logout()

        challenge = client.post(
            LOGIN, {'username': user.username, 'password': pwd}, format='json'
        ).data['challenge_token']

        resp = client.post(VERIFY, {'challenge_token': challenge, 'code': codes[0]}, format='json')
        assert resp.status_code == 200
        assert resp.data['access']

    def test_verify_with_invalid_code_is_rejected(self):
        user, pwd = _user_with_password()
        client = APIClient()
        client.force_authenticate(user)
        _enable_2fa(client)
        client.logout()

        challenge = client.post(
            LOGIN, {'username': user.username, 'password': pwd}, format='json'
        ).data['challenge_token']

        resp = client.post(
            VERIFY, {'challenge_token': challenge, 'code': '000000'}, format='json'
        )
        assert resp.status_code == 400
        body = resp.data
        code = body['error']['code'] if 'error' in body else None
        assert code == 'INVALID_2FA_CODE'

    def test_verify_with_bad_challenge_token(self):
        resp = APIClient().post(
            VERIFY, {'challenge_token': 'not-a-token', 'code': '123456'}, format='json'
        )
        assert resp.status_code == 400


class TestAuditTrail:
    def test_challenge_is_not_a_completed_login(self):
        from apps.audit.models import AuditLog
        from apps.authentication.models import LoginLog

        user, pwd = _user_with_password()
        client = APIClient()
        client.force_authenticate(user)
        secret = _enable_2fa(client)
        client.logout()

        challenge = client.post(
            LOGIN, {'username': user.username, 'password': pwd}, format='json'
        ).data['challenge_token']

        # login/senha ok, mas ainda falta o 2º fator → não é sessão iniciada
        assert AuditLog.objects.filter(action='LOGIN_2FA_CHALLENGE').exists()
        assert not AuditLog.objects.filter(action='LOGIN').exists()
        assert not LoginLog.objects.filter(user=user).exists()

        client.post(
            VERIFY, {'challenge_token': challenge, 'code': pyotp.TOTP(secret).now()}, format='json'
        )
        # o /totp/verify/ é que registra a sessão de fato
        assert AuditLog.objects.filter(action='LOGIN', request_path=VERIFY).exists()
        assert LoginLog.objects.filter(user=user, success=True).exists()


class TestDisable:
    def test_disable_removes_2fa(self):
        user, pwd = _user_with_password()
        client = APIClient()
        client.force_authenticate(user)
        _enable_2fa(client)

        assert client.post(DISABLE).status_code == 200
        assert client.get(STATUS).data['enabled'] is False

        client.logout()
        # login volta a ser direto
        resp = client.post(LOGIN, {'username': user.username, 'password': pwd}, format='json')
        assert resp.data['requires_2fa'] is False

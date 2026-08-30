"""2FA/TOTP — testes de serviço."""

import pyotp
import pytest
from django.utils import timezone

from apps.authentication.models import BackupCode, TOTPDevice
from apps.authentication.services import totp_service
from apps.authentication.tests.factories import UserFactory
from core.exceptions import BusinessLogicError

pytestmark = pytest.mark.django_db


def _activate(user):
    """Ativa e confirma o 2FA, devolvendo (secret, backup_codes)."""
    data = totp_service.generate_totp_secret(user)
    codes = totp_service.confirm_totp(user, pyotp.TOTP(data['secret']).now())['backup_codes']
    return data['secret'], codes


class TestGenerateAndCrypto:
    def test_generate_returns_qr_secret_and_unconfirmed_device(self):
        user = UserFactory()
        result = totp_service.generate_totp_secret(user)

        assert result['qr_code'].startswith('data:image/png;base64,')
        assert len(result['secret']) == 32
        device = TOTPDevice.objects.get(user=user)
        assert device.confirmed is False
        # segredo nunca vai em claro para o banco
        assert device.secret != result['secret']
        assert totp_service.decrypt_secret(device.secret) == result['secret']

    def test_generate_fails_if_already_enabled(self):
        user = UserFactory()
        _activate(user)
        with pytest.raises(BusinessLogicError) as exc:
            totp_service.generate_totp_secret(user)
        assert exc.value.code == 'TOTP_ALREADY_ENABLED'

    def test_generate_twice_before_confirm_replaces_secret(self):
        user = UserFactory()
        first = totp_service.generate_totp_secret(user)['secret']
        second = totp_service.generate_totp_secret(user)['secret']
        assert first != second
        assert TOTPDevice.objects.filter(user=user).count() == 1


class TestConfirm:
    def test_confirm_with_valid_code_returns_8_backup_codes(self):
        user = UserFactory()
        data = totp_service.generate_totp_secret(user)
        result = totp_service.confirm_totp(user, pyotp.TOTP(data['secret']).now())

        assert len(result['backup_codes']) == 8
        assert all('-' in c and len(c) == 9 for c in result['backup_codes'])
        user.refresh_from_db()
        assert user.totp_device.confirmed is True
        assert user.totp_device.confirmed_at is not None

    def test_confirm_with_invalid_code(self):
        user = UserFactory()
        totp_service.generate_totp_secret(user)
        with pytest.raises(BusinessLogicError) as exc:
            totp_service.confirm_totp(user, '000000')
        assert exc.value.code == 'INVALID_TOTP_CODE'

    def test_confirm_twice_fails(self):
        user = UserFactory()
        secret, _ = _activate(user)
        with pytest.raises(BusinessLogicError) as exc:
            totp_service.confirm_totp(user, pyotp.TOTP(secret).now())
        assert exc.value.code == 'TOTP_ALREADY_CONFIRMED'


class TestVerify:
    def test_valid_totp_code(self):
        user = UserFactory()
        secret, _ = _activate(user)
        assert totp_service.verify_totp_code(user, pyotp.TOTP(secret).now()) is True

    def test_backup_code_is_single_use(self):
        user = UserFactory()
        _, codes = _activate(user)
        assert totp_service.verify_totp_code(user, codes[0]) is True
        assert totp_service.verify_totp_code(user, codes[0]) is False
        assert BackupCode.objects.filter(user=user, used=True).count() == 1
        assert totp_service.remaining_backup_codes(user) == 7

    def test_returns_false_without_or_unconfirmed_2fa(self):
        no2fa = UserFactory()
        assert totp_service.verify_totp_code(no2fa, '123456') is False

        pending = UserFactory()
        totp_service.generate_totp_secret(pending)
        assert totp_service.verify_totp_code(pending, '123456') is False

    def test_rejects_garbage(self):
        user = UserFactory()
        _activate(user)
        assert totp_service.verify_totp_code(user, 'abcdef') is False
        assert totp_service.verify_totp_code(user, '9999-9999') is False


class TestDisable:
    def test_disable_removes_device_and_codes(self):
        user = UserFactory()
        _activate(user)
        assert TOTPDevice.objects.filter(user=user).exists()
        assert BackupCode.objects.filter(user=user).count() == 8

        totp_service.disable_totp(user)

        assert not TOTPDevice.objects.filter(user=user).exists()
        assert not BackupCode.objects.filter(user=user).exists()

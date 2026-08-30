"""Autenticação em dois fatores (2FA) com TOTP — RFC 6238.

Compatível com Google Authenticator, Microsoft Authenticator, Authy, Aegis, 2FAS
e qualquer app aderente ao RFC 6238. Todo o processamento é local; não há
chamada externa, SMS ou API paga.

Segurança
- O segredo TOTP base32 é criptografado com **Fernet** antes de ir para o banco.
- Os *backup codes* são hasheados com **SHA-256** (irreversíveis) e de uso único.
- A verificação usa ``valid_window=1`` (tolera ±30 s de *clock skew*).
"""

from __future__ import annotations

import base64
import hashlib
import io
import secrets

import pyotp
import qrcode
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError
from apps.authentication.models import BackupCode, TOTPDevice

User = get_user_model()

BACKUP_CODE_COUNT = 8


# --------------------------------------------------------------------------- #
#  Criptografia do segredo                                                     #
# --------------------------------------------------------------------------- #

def _cipher() -> Fernet:
    """Fernet derivado de ``settings.TOTP_ENCRYPTION_KEY`` (SHA-256 → 32 bytes)."""
    key = base64.urlsafe_b64encode(
        hashlib.sha256(settings.TOTP_ENCRYPTION_KEY.encode()).digest()
    )
    return Fernet(key)


def encrypt_secret(secret: str) -> str:
    return _cipher().encrypt(secret.encode()).decode()


def decrypt_secret(encrypted: str) -> str:
    try:
        return _cipher().decrypt(encrypted.encode()).decode()
    except (InvalidToken, ValueError) as exc:  # pragma: no cover - corrupção/rotação de chave
        raise BusinessLogicError(
            code='TOTP_SECRET_UNREADABLE',
            message='Não foi possível ler o segredo 2FA. Refaça a ativação.',
        ) from exc


# --------------------------------------------------------------------------- #
#  Ativação                                                                    #
# --------------------------------------------------------------------------- #

def _device_for(user):
    """Sempre uma leitura fresca — o cache do acessor reverso pode estar velho."""
    return TOTPDevice.objects.filter(user=user).first()


def generate_totp_secret(user) -> dict:
    """Cria (ou recria) um dispositivo TOTP **não confirmado** e devolve o QR code.

    Levanta ``TOTP_ALREADY_ENABLED`` se o usuário já tem 2FA confirmado.
    """
    device = _device_for(user)
    if device is not None and device.confirmed:
        raise BusinessLogicError(
            code='TOTP_ALREADY_ENABLED',
            message='O 2FA já está ativado para este usuário.',
        )

    secret = pyotp.random_base32()
    device, _ = TOTPDevice.objects.update_or_create(
        user=user,
        defaults={'secret': encrypt_secret(secret), 'confirmed': False, 'confirmed_at': None},
    )

    uri = pyotp.TOTP(secret).provisioning_uri(
        name=user.email or user.username,
        issuer_name=settings.TOTP_ISSUER_NAME,
    )
    buffer = io.BytesIO()
    qrcode.make(uri).save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    return {
        'secret': secret,  # exibido UMA vez, para entrada manual
        'qr_code': f'data:image/png;base64,{qr_base64}',
        'device_id': str(device.id),
    }


@transaction.atomic
def confirm_totp(user, code: str) -> dict:
    """Confirma a ativação verificando o primeiro código e devolve os backup codes."""
    device = (
        TOTPDevice.objects.select_for_update().filter(user=user).first()
    )
    if device is None:
        raise BusinessLogicError(
            code='TOTP_NOT_STARTED',
            message='Inicie a ativação do 2FA antes de confirmar.',
        )
    if device.confirmed:
        raise BusinessLogicError(
            code='TOTP_ALREADY_CONFIRMED',
            message='O 2FA já foi confirmado anteriormente.',
        )

    totp = pyotp.TOTP(decrypt_secret(device.secret))
    if not totp.verify(str(code), valid_window=1):
        raise BusinessLogicError(
            code='INVALID_TOTP_CODE',
            message='Código inválido. Verifique o horário do dispositivo e tente de novo.',
        )

    device.confirmed = True
    device.confirmed_at = timezone.now()
    device.save(update_fields=['confirmed', 'confirmed_at', 'updated_at'])

    return {'backup_codes': generate_backup_codes(user)}


def generate_backup_codes(user, count: int = BACKUP_CODE_COUNT) -> list[str]:
    """Regenera os backup codes do usuário (formato ``1234-5678``)."""
    user.backup_codes.all().delete()
    plain = []
    for _ in range(count):
        code = f'{secrets.randbelow(10000):04d}-{secrets.randbelow(10000):04d}'
        BackupCode.objects.create(
            user=user, code=hashlib.sha256(code.encode()).hexdigest()
        )
        plain.append(code)
    return plain


# --------------------------------------------------------------------------- #
#  Verificação (login — etapa 2)                                               #
# --------------------------------------------------------------------------- #

def verify_totp_code(user, code: str) -> bool:
    """Aceita um código TOTP de 6 dígitos **ou** um backup code ``XXXX-XXXX``."""
    device = _device_for(user)
    if device is None or not device.confirmed:
        return False

    code = str(code).strip()

    if len(code) == 6 and code.isdigit():
        totp = pyotp.TOTP(decrypt_secret(device.secret))
        if totp.verify(code, valid_window=1):
            return True

    if len(code) == 9 and code[4] == '-':
        return _consume_backup_code(user, code)

    return False


@transaction.atomic
def _consume_backup_code(user, code: str) -> bool:
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    backup = (
        BackupCode.objects.select_for_update()
        .filter(user=user, code=code_hash, used=False)
        .first()
    )
    if backup is None:
        return False
    backup.used = True
    backup.used_at = timezone.now()
    backup.save(update_fields=['used', 'used_at', 'updated_at'])
    return True


# --------------------------------------------------------------------------- #
#  Desativação e utilitários                                                   #
# --------------------------------------------------------------------------- #

@transaction.atomic
def disable_totp(user) -> None:
    """Remove o dispositivo e todos os backup codes do usuário."""
    TOTPDevice.objects.filter(user=user).delete()
    user.backup_codes.all().delete()


def is_totp_enabled(user) -> bool:
    return TOTPDevice.objects.filter(user=user, confirmed=True).exists()


def get_confirmed_device(user):
    return TOTPDevice.objects.filter(user=user, confirmed=True).first()


def remaining_backup_codes(user) -> int:
    return user.backup_codes.filter(used=False).count()

"""Recuperação de senha (P2-PWDRESET).

Token opaco de 2h, uso único, hash guardado no banco (nunca o token em claro).
Resposta sempre genérica na solicitação — não revela se o e-mail existe.
"""

from __future__ import annotations

import hashlib
import logging
import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

from core.exceptions import BusinessLogicError
from core.models import User
from core.validators import normalize_cpf
from apps.authentication.models import PasswordReset

logger = logging.getLogger(__name__)

TOKEN_TTL = timezone.timedelta(hours=2)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _find_user(email_or_username: str) -> User | None:
    ident = (email_or_username or '').strip()
    if not ident:
        return None
    lookup = Q(email__iexact=ident) | Q(username__iexact=ident)
    digits = normalize_cpf(ident) or ''
    if len(digits) == 11 and digits.isdigit():
        lookup |= Q(cpf=digits)
    return User.objects.filter(is_active=True).filter(lookup).first()


@transaction.atomic
def request_password_reset(*, email_or_username: str) -> PasswordReset | None:
    """Gera o token e dispara o e-mail. Retorna None se o usuário não existe
    (o chamador deve responder com sucesso genérico de qualquer forma)."""
    user = _find_user(email_or_username)
    if user is None:
        return None

    # invalida pedidos anteriores em aberto
    PasswordReset.objects.filter(user=user, used=False).update(used=True)

    raw_token = secrets.token_urlsafe(32)
    reset = PasswordReset.objects.create(
        user=user,
        token=_hash(raw_token),
        expires_at=timezone.now() + TOKEN_TTL,
    )

    link = f'{settings.FRONTEND_BASE_URL}/redefinir-senha/{raw_token}'
    context = {
        'user_name': user.get_full_name() or user.username,
        'reset_link': link,
        'ttl_hours': int(TOKEN_TTL.total_seconds() // 3600),
    }
    body = render_to_string('authentication/password_reset_email.txt', context)
    try:
        send_mail(
            subject='Redefinição de senha — Rede Municipal de Educação',
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )
    except Exception:  # noqa: BLE001 — falha de SMTP não deve vazar p/ o cliente
        logger.exception('Falha ao enviar e-mail de redefinição de senha')
    return reset


@transaction.atomic
def confirm_password_reset(*, token: str, new_password: str) -> User:
    reset = (
        PasswordReset.objects.select_for_update()
        .select_related('user')
        .filter(token=_hash(token or ''), used=False)
        .first()
    )
    if reset is None:
        raise BusinessLogicError(
            code='INVALID_RESET_TOKEN',
            message='Link de redefinição inválido ou já utilizado.',
        )
    if reset.expires_at < timezone.now():
        raise BusinessLogicError(
            code='EXPIRED_RESET_TOKEN',
            message='Link de redefinição expirado. Solicite um novo.',
        )
    if len(new_password or '') < 8:
        raise BusinessLogicError(
            code='WEAK_PASSWORD',
            message='A nova senha deve ter ao menos 8 caracteres.',
        )

    user = reset.user
    user.set_password(new_password)
    user.save(update_fields=['password'])

    reset.used = True
    reset.save(update_fields=['used', 'updated_at'])
    # invalida quaisquer outros tokens do mesmo usuário
    PasswordReset.objects.filter(user=user, used=False).update(used=True)
    return user

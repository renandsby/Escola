"""Verificação de e-mail (DX-SGE-006).

Contas de responsável nascem com o e-mail **não verificado** e só liberam o
acesso à vida escolar após a confirmação. Token opaco de 3 dias, hash no banco.
"""

from __future__ import annotations

import hashlib
import logging
import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from core.exceptions import BusinessLogicError
from core.models import User
from apps.authentication.models import EmailVerification

logger = logging.getLogger(__name__)

TOKEN_TTL = timezone.timedelta(days=3)


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def start_verification(*, user: User) -> EmailVerification:
    """(Re)cria o token e dispara o e-mail de confirmação."""
    EmailVerification.objects.filter(user=user).delete()

    raw_token = secrets.token_urlsafe(32)
    now = timezone.now()
    ev = EmailVerification.objects.create(
        user=user,
        token=_hash(raw_token),
        expires_at=now + TOKEN_TTL,
        sent_at=now,
    )

    link = f'{settings.FRONTEND_BASE_URL}/verificar-email/{raw_token}'
    body = render_to_string(
        'authentication/email_verification.txt',
        {'user_name': user.get_full_name() or user.email, 'link': link},
    )
    try:
        send_mail(
            subject='Confirme seu e-mail — Rede Municipal de Educação',
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )
    except Exception:  # noqa: BLE001 — falha de SMTP não deve quebrar o cadastro
        logger.exception('Falha ao enviar e-mail de verificação para %s', user.email)
    return ev


def confirm(*, raw_token: str) -> User:
    ev = (
        EmailVerification.objects.select_related('user')
        .filter(token=_hash(raw_token or ''), verified=False)
        .first()
    )
    if ev is None:
        raise BusinessLogicError(
            code='INVALID_VERIFICATION_TOKEN',
            message='Link de verificação inválido ou já utilizado.',
        )
    if ev.expires_at and ev.expires_at < timezone.now():
        raise BusinessLogicError(
            code='EXPIRED_VERIFICATION_TOKEN',
            message='Link de verificação expirado. Solicite um novo.',
        )
    ev.verified = True
    ev.verified_at = timezone.now()
    ev.save(update_fields=['verified', 'verified_at', 'updated_at'])
    return ev.user


def resend(*, user: User) -> EmailVerification:
    if is_verified(user):
        raise BusinessLogicError(
            code='EMAIL_ALREADY_VERIFIED',
            message='Este e-mail já foi verificado.',
        )
    return start_verification(user=user)


def is_verified(user) -> bool:
    """Verdadeiro se não há registro de verificação (contas criadas pela equipe
    / anteriores ao recurso são grandfathered) **ou** se o registro está
    confirmado. Só bloqueia contas com uma verificação pendente — o que, na
    prática, são exatamente as do auto-cadastro.

    Consulta fresca (sem cache de relação) para que a sessão do usuário libere o
    acesso assim que ele confirmar o e-mail em outra aba.
    """
    if user is None or not getattr(user, 'pk', None):
        return False
    row = (
        EmailVerification.objects.filter(user_id=user.pk)
        .values_list('verified', flat=True)
        .first()
    )
    return row is None or row

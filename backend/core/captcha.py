"""Verificação de CAPTCHA server-side (DX-SGE-006).

Suporta Cloudflare Turnstile / hCaptcha / reCAPTCHA — todos expõem um endpoint
``siteverify`` que recebe ``secret`` + ``response``. Sem dependência nova (usa
``requests``, já no projeto). No-op quando ``CAPTCHA_ENABLED`` é ``False``
(dev/CI).
"""

from __future__ import annotations

import logging

import requests
from django.conf import settings

from core.exceptions import BusinessLogicError

logger = logging.getLogger(__name__)


def verify_captcha(token: str | None, remote_ip: str | None = None) -> None:
    """Levanta ``BusinessLogicError`` se o token for ausente ou inválido."""
    if not getattr(settings, 'CAPTCHA_ENABLED', False):
        return

    if not token:
        raise BusinessLogicError(
            code='CAPTCHA_REQUIRED',
            message='Confirmação anti-robô ausente.',
        )

    try:
        resp = requests.post(
            settings.CAPTCHA_VERIFY_URL,
            data={
                'secret': settings.CAPTCHA_SECRET,
                'response': token,
                'remoteip': remote_ip or '',
            },
            timeout=5,
        )
        ok = resp.ok and bool(resp.json().get('success'))
    except (requests.RequestException, ValueError):
        logger.exception('Falha ao contatar o provedor de CAPTCHA')
        raise BusinessLogicError(
            code='CAPTCHA_UNAVAILABLE',
            message='Não foi possível validar a confirmação anti-robô. Tente novamente.',
            status_code=503,
        )

    if not ok:
        raise BusinessLogicError(
            code='CAPTCHA_INVALID',
            message='Falha na verificação anti-robô.',
        )

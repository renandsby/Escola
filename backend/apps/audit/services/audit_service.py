"""Registro de auditoria (P1-AUDIT).

``log_action`` é o único ponto de escrita em ``AuditLog``. Sempre sanitiza o
payload removendo credenciais e tokens antes de persistir.
"""

from __future__ import annotations

import logging

from apps.audit.models import AuditLog

logger = logging.getLogger(__name__)

REDACTED = '***'

SENSITIVE_KEYS = {
    'password', 'password_confirm', 'current_password', 'new_password',
    'new_password_confirm', 'old_password',
    'token', 'access', 'refresh', 'access_token', 'refresh_token',
    'secret', 'secret_key', 'api_key', 'apikey', 'authorization',
    'private_key', 'client_secret',
}

_MAX_DEPTH = 6


def sanitize(value, _depth: int = 0):
    """Redige recursivamente chaves sensíveis de dicts/listas."""
    if _depth > _MAX_DEPTH:
        return REDACTED
    if isinstance(value, dict):
        return {
            k: (REDACTED if str(k).lower() in SENSITIVE_KEYS else sanitize(v, _depth + 1))
            for k, v in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [sanitize(v, _depth + 1) for v in value][:200]
    if isinstance(value, str) and len(value) > 2000:
        return value[:2000] + '…'
    return value


def _valid_ip(ip):
    if not ip:
        return None
    ip = ip.strip()
    return ip or None


def log_action(
    *,
    user=None,
    action: str,
    resource: str = '',
    resource_id=None,
    details=None,
    ip_address=None,
    user_agent: str = '',
    request_method: str = '',
    request_path: str = '',
    status_code=None,
) -> AuditLog | None:
    try:
        acting = user if (user is not None and getattr(user, 'is_authenticated', False)) else None
        return AuditLog.objects.create(
            user=acting,
            action=action[:64],
            model_name=(resource or '')[:100],
            object_id=str(resource_id or '')[:255],
            changes=sanitize(details or {}),
            ip_address=_valid_ip(ip_address),
            user_agent=(user_agent or '')[:2000],
            request_method=(request_method or '')[:8],
            request_path=(request_path or '')[:255],
            status_code=status_code,
        )
    except Exception:  # noqa: BLE001 — auditoria nunca pode derrubar a requisição
        logger.exception('Falha ao gravar AuditLog (action=%s resource=%s)', action, resource)
        return None

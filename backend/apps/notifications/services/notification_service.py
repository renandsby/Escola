"""Emissão de notificações in-app (P2-NOTIF).

``notify_user`` cria uma notificação para um usuário; ``notify_role`` distribui
para todos os usuários ativos de um papel, opcionalmente restrito a uma escola
ou secretaria. Os gatilhos de negócio chamam estas funções — nunca criam
``Notification`` diretamente.
"""

from __future__ import annotations

import logging

from core.models import User
from apps.notifications.models import Notification

logger = logging.getLogger(__name__)


def notify_user(*, user, title, message, category='system', link=''):
    if user is None or not getattr(user, 'is_authenticated', True):
        return None
    try:
        return Notification.objects.create(
            user=user,
            title=title[:255],
            message=message,
            notification_type=category,
            link=link or '',
        )
    except Exception:  # noqa: BLE001 — notificação nunca deve quebrar o fluxo
        logger.exception('Falha ao criar notificação para user=%s', getattr(user, 'id', None))
        return None


def notify_role(*, role, title, message, category='system', link='', department_id=None, school_id=None):
    qs = User.objects.filter(role=role, is_active=True)
    if school_id is not None:
        qs = qs.filter(school_id=school_id)
    if department_id is not None:
        qs = qs.filter(education_department_id=department_id)
    created = []
    for user in qs.iterator():
        note = notify_user(
            user=user, title=title, message=message, category=category, link=link
        )
        if note is not None:
            created.append(note)
    return created


def notify_roles(*, roles, **kwargs):
    out = []
    for role in roles:
        out.extend(notify_role(role=role, **kwargs))
    return out

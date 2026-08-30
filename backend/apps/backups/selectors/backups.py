"""Consultas de backup — visíveis apenas para ``sme_admin`` (P1-BACKUP §3)."""

from apps.backups.models import Backup
from core.models import UserRole


def get_backups_for_user(*, user):
    if getattr(user, 'role', None) != UserRole.SME_ADMIN:
        return Backup.objects.none()
    return Backup.objects.all().select_related('requested_by')

"""Backup noturno agendado (P1-BACKUP). Agendamento em ``CELERY_BEAT_SCHEDULE``."""

from celery import shared_task

RETENTION_DAYS = 30


@shared_task(name='backups.run_nightly_backup')
def run_nightly_backup():
    from apps.backups.models import BackupStatus, BackupTrigger
    from apps.backups.services.backup_service import (
        create_database_backup,
        prune_old_backups,
    )

    backup = create_database_backup(triggered_by=BackupTrigger.AUTOMATED)
    pruned = prune_old_backups(retention_days=RETENTION_DAYS)
    return {
        'backup_id': str(backup.id),
        'status': backup.status,
        'size_mb': backup.size_mb,
        'pruned': pruned,
        'ok': backup.status == BackupStatus.COMPLETED,
    }

"""Execução e retenção de backups do banco (P1-BACKUP).

O dump é feito com ``pg_dump`` (formato SQL) comprimido em ``.sql.gz`` e
gravado no storage de mídia (``MEDIA_ROOT/backups/AAAA/MM/``). Em produção
com S3 configurado o mesmo caminho relativo vale para o bucket.
"""

from __future__ import annotations

import gzip
import hashlib
import shutil
import subprocess
import tempfile
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.utils import timezone

from core.exceptions import BusinessLogicError

from apps.backups.models import Backup, BackupStatus, BackupTrigger

_CHUNK = 1024 * 1024


def _db() -> dict:
    return settings.DATABASES['default']


def _pg_dump_to(path: Path) -> None:
    """Roda pg_dump e grava o SQL comprimido em ``path`` (.sql.gz)."""
    db = _db()
    cmd = [
        'pg_dump',
        '--dbname', db['NAME'],
        '--host', db['HOST'] or 'localhost',
        '--port', str(db['PORT'] or 5432),
        '--username', db['USER'],
        '--no-owner',
        '--no-privileges',
        '--clean',
        '--if-exists',
    ]
    env = {'PGPASSWORD': db['PASSWORD'] or '', 'PATH': '/usr/bin:/usr/local/bin:/bin'}
    with tempfile.NamedTemporaryFile(suffix='.sql') as raw:
        result = subprocess.run(
            cmd, stdout=raw, stderr=subprocess.PIPE, env=env, timeout=1800, check=False
        )
        if result.returncode != 0:
            raise RuntimeError(
                f'pg_dump falhou (código {result.returncode}): '
                f'{result.stderr.decode("utf-8", "replace")[:2000]}'
            )
        raw.flush()
        raw.seek(0)
        with gzip.open(path, 'wb') as gz:
            shutil.copyfileobj(raw, gz, length=_CHUNK)


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as fh:
        for chunk in iter(lambda: fh.read(_CHUNK), b''):
            h.update(chunk)
    return h.hexdigest()


def create_database_backup(*, triggered_by: str = BackupTrigger.AUTOMATED, user=None) -> Backup:
    """Gera um backup do banco. Nunca levanta em falha de dump — grava
    ``status=FAILED`` com o log e devolve o registro."""
    backup = Backup.objects.create(
        backup_type='database',
        triggered_by=triggered_by,
        requested_by=user,
        status=BackupStatus.RUNNING,
        started_at=timezone.now(),
    )
    stamp = timezone.now().strftime('%Y%m%d-%H%M%S')
    filename = f'escola-{stamp}.sql.gz'

    with tempfile.TemporaryDirectory() as tmp:
        local = Path(tmp) / filename
        try:
            _pg_dump_to(local)
            checksum = _sha256(local)
            size_mb = round(local.stat().st_size / (1024 * 1024), 3)
            with local.open('rb') as fh:
                backup.backup_file.save(filename, File(fh), save=False)
            backup.checksum = checksum
            backup.size_mb = size_mb
            backup.status = BackupStatus.COMPLETED
            backup.finished_at = timezone.now()
            backup.save(update_fields=[
                'backup_file', 'checksum', 'size_mb', 'status', 'finished_at', 'updated_at',
            ])
        except Exception as exc:  # noqa: BLE001 — registra qualquer falha
            backup.status = BackupStatus.FAILED
            backup.error_log = str(exc)[:5000]
            backup.finished_at = timezone.now()
            backup.save(update_fields=['status', 'error_log', 'finished_at', 'updated_at'])
    return backup


def prune_old_backups(*, retention_days: int = 30) -> int:
    """Apaga arquivo + registro dos backups mais antigos que a retenção."""
    cutoff = timezone.now() - timedelta(days=retention_days)
    old = list(Backup.objects.filter(created_at__lt=cutoff))
    for backup in old:
        if backup.backup_file:
            backup.backup_file.delete(save=False)
        backup.delete()
    return len(old)


_MIN_INTERVAL = timedelta(minutes=10)


def ensure_manual_backup_allowed(user) -> None:
    """Rate-limit simples: 1 backup manual a cada 10 minutos por rede."""
    recent = Backup.objects.filter(
        triggered_by=BackupTrigger.MANUAL,
        created_at__gte=timezone.now() - _MIN_INTERVAL,
    ).exists()
    if recent:
        raise BusinessLogicError(
            'BACKUP_RATE_LIMITED',
            'Já houve um backup manual nos últimos 10 minutos. Aguarde.',
            status_code=429,
        )

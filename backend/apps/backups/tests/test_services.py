"""Testes do serviço de backup (P1-BACKUP §4)."""

import gzip
from datetime import timedelta
from unittest import mock

import pytest
from django.utils import timezone

from apps.backups.models import Backup, BackupStatus
from apps.backups.services.backup_service import (
    create_database_backup,
    prune_old_backups,
)


def _fake_pg_dump_success(cmd, stdout, stderr, env, timeout, check):
    # conteúdo variado (não comprime a zero) — o tamanho gravado deve ser real
    import os

    stdout.write(b"-- dump\nCREATE TABLE x (id int);\n")
    stdout.write(os.urandom(3 * 1024 * 1024))
    return mock.Mock(returncode=0, stderr=b"")


def _fake_pg_dump_fail(cmd, stdout, stderr, env, timeout, check):
    return mock.Mock(returncode=1, stderr=b"connection refused")


@pytest.mark.django_db
class TestCreateDatabaseBackup:
    def test_success_records_size_and_checksum(self):
        with mock.patch("subprocess.run", side_effect=_fake_pg_dump_success):
            backup = create_database_backup(triggered_by="manual")

        backup.refresh_from_db()
        assert backup.status == BackupStatus.COMPLETED
        assert backup.size_mb > 0
        assert len(backup.checksum) == 64
        assert backup.backup_file.name.endswith(".sql.gz")
        assert backup.finished_at is not None
        # o arquivo é um gzip válido com o conteúdo do dump
        with backup.backup_file.open("rb") as fh:
            assert b"CREATE TABLE" in gzip.decompress(fh.read())

    def test_dump_failure_marks_failed_with_log(self):
        with mock.patch("subprocess.run", side_effect=_fake_pg_dump_fail):
            backup = create_database_backup(triggered_by="automated")

        backup.refresh_from_db()
        assert backup.status == BackupStatus.FAILED
        assert "connection refused" in backup.error_log
        assert not backup.backup_file


@pytest.mark.django_db
class TestPruneOldBackups:
    def test_removes_records_and_files_older_than_retention(self):
        with mock.patch("subprocess.run", side_effect=_fake_pg_dump_success):
            old = create_database_backup(triggered_by="automated")
            recent = create_database_backup(triggered_by="automated")

        Backup.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timedelta(days=45)
        )
        old_path = old.backup_file.path

        removed = prune_old_backups(retention_days=30)

        assert removed == 1
        assert not Backup.objects.filter(pk=old.pk).exists()
        assert Backup.objects.filter(pk=recent.pk).exists()
        import os

        assert not os.path.exists(old_path)

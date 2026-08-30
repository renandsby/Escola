"""Testes de RBAC e do disparo manual de backup (P1-BACKUP §3-4)."""

from datetime import timedelta
from unittest import mock

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.backups.models import Backup, BackupTrigger
from apps.students.tests.factories import (
    SchoolDirectorFactory,
    SMEAdminFactory,
    SMESupervisorFactory,
)

URL = "/api/v1/backups/"


def _client(user=None):
    c = APIClient()
    if user:
        c.force_authenticate(user)
    return c


def _fake_dump(cmd, stdout, stderr, env, timeout, check):
    stdout.write(b"-- dump\n" * 20)
    return mock.Mock(returncode=0, stderr=b"")


@pytest.mark.django_db
class TestBackupRBAC:
    def test_requires_authentication(self):
        assert _client().get(URL).status_code == 401

    @pytest.mark.parametrize("factory", [SMESupervisorFactory, SchoolDirectorFactory])
    def test_non_admin_forbidden(self, factory):
        assert _client(factory()).get(URL).status_code == 403
        assert _client(factory()).post(URL + "trigger/").status_code == 403

    def test_admin_lists_backups(self):
        Backup.objects.create(backup_type="database", status="COMPLETED", size_mb=10)
        res = _client(SMEAdminFactory()).get(URL)
        assert res.status_code == 200
        assert res.data["count"] == 1


@pytest.mark.django_db
class TestManualTrigger:
    def test_trigger_creates_backup(self):
        with mock.patch("subprocess.run", side_effect=_fake_dump):
            res = _client(SMEAdminFactory()).post(URL + "trigger/")
        assert res.status_code == 201
        assert res.data["triggered_by"] == BackupTrigger.MANUAL
        assert res.data["status"] == "COMPLETED"

    def test_trigger_rate_limited(self):
        Backup.objects.create(
            backup_type="database", triggered_by=BackupTrigger.MANUAL, status="COMPLETED",
        )
        with mock.patch("subprocess.run", side_effect=_fake_dump):
            res = _client(SMEAdminFactory()).post(URL + "trigger/")
        assert res.status_code == 429
        assert res.data["error"]["code"] == "BACKUP_RATE_LIMITED"

    def test_trigger_allowed_after_interval(self):
        b = Backup.objects.create(
            backup_type="database", triggered_by=BackupTrigger.MANUAL, status="COMPLETED",
        )
        Backup.objects.filter(pk=b.pk).update(
            created_at=timezone.now() - timedelta(minutes=15)
        )
        with mock.patch("subprocess.run", side_effect=_fake_dump):
            res = _client(SMEAdminFactory()).post(URL + "trigger/")
        assert res.status_code == 201

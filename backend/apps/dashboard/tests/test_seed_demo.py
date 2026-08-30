"""Smoke test do comando seed_dashboard_demo — a carga fictícia do painel."""

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.class_diary.models import Attendance, Grade
from apps.students.models import Enrollment, TransferRequest
from core.models import User


@pytest.mark.django_db
def test_seed_dashboard_demo_lights_up_every_panel():
    call_command("seed_censo_igarassu", "--no-admin")
    call_command("seed_dashboard_demo", "--schools", "3", "--per-class", "8", "--seed", "1")

    assert Enrollment.objects.filter(enrollment_number__startswith="DEMO").exists()
    assert Attendance.objects.exists()
    assert Grade.objects.exists()
    assert TransferRequest.objects.filter(status="PENDING_SME").exists()

    admin = User.objects.create_superuser(
        username="demo_admin", email="d@d.com", password="x", role="sme_admin"
    )
    from apps.governance.models import EducationDepartment

    admin.education_department = EducationDepartment.objects.get(municipality_name="Igarassu")
    admin.save()

    client = APIClient()
    client.force_authenticate(admin)
    body = client.get("/api/v1/dashboard/overview/").data

    assert body["kpis"]["active_enrollments"]["value"] > 0
    assert body["kpis"]["diary_completeness"]["value"] is not None
    assert body["attendance_trend"] is not None
    assert body["performance"] is not None
    assert body["movement"] is not None

    # no escopo de uma escola povoada, a tabela por turma traz % real
    # (regressão do bug "grades_launched_pct sempre null")
    seeded_school = (
        Enrollment.objects.filter(enrollment_number__startswith="DEMO")
        .select_related("school_class")
        .first()
        .school_class.school_id
    )
    scoped = client.get(
        "/api/v1/dashboard/overview/",
        {"scope": "school", "school_id": str(seeded_school)},
    ).data
    rows = scoped["diary_completeness"]["rows"]
    assert scoped["diary_completeness"]["group_by"] == "class"
    assert any(r["grades_launched_pct"] is not None for r in rows)


@pytest.mark.django_db
def test_seed_dashboard_demo_fresh_is_idempotent():
    call_command("seed_censo_igarassu", "--no-admin")
    args = ["seed_dashboard_demo", "--fresh", "--schools", "2", "--per-class", "6", "--seed", "2"]
    call_command(*args)
    first = Enrollment.objects.filter(enrollment_number__startswith="DEMO").count()

    call_command(*args)
    second = Enrollment.objects.filter(enrollment_number__startswith="DEMO").count()

    assert first == second
    assert first > 0

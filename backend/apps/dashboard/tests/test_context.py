"""Testes do endpoint /api/v1/dashboard/context/ (casca do frontend)."""

from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient

from apps.governance.tests.factories import (
    AcademicPeriodFactory,
    AcademicYearFactory,
    EducationDepartmentFactory,
)
from apps.students.tests.factories import (
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    TeacherUserFactory,
)

URL = "/api/v1/dashboard/context/"


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestNetworkContext:
    def test_requires_authentication(self):
        assert _client().get(URL).status_code == 401

    def test_sme_admin_gets_municipality_and_current_period(self):
        dept = EducationDepartmentFactory(municipality_name="Igarassu")
        year = AcademicYearFactory(education_department=dept, status="ACTIVE", year=2025)
        today = date.today()
        AcademicPeriodFactory(
            academic_year=year,
            name="3º Bimestre",
            period_number=3,
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=25),
        )
        admin = SMEAdminFactory(education_department=dept)

        res = _client(admin).get(URL)

        assert res.status_code == 200
        assert res.data["municipality_name"] == "Igarassu"
        assert res.data["academic_year"] == 2025
        assert res.data["term"] == 3
        assert res.data["term_label"] == "3º Bimestre"

    def test_teacher_resolves_period_via_school_department(self):
        dept = EducationDepartmentFactory(municipality_name="Igarassu")
        year = AcademicYearFactory(education_department=dept, status="ACTIVE", year=2025)
        AcademicPeriodFactory(academic_year=year, name="1º Bimestre", period_number=1)
        school = SchoolFactory(education_department=dept)
        teacher = TeacherUserFactory(school=school, education_department=None)

        res = _client(teacher).get(URL)

        assert res.status_code == 200
        assert res.data["municipality_name"] == "Igarassu"
        assert res.data["academic_year"] == 2025

    def test_school_director_resolves_period_via_school_department(self):
        dept = EducationDepartmentFactory(municipality_name="Olinda")
        AcademicYearFactory(education_department=dept, status="ACTIVE", year=2025)
        school = SchoolFactory(education_department=dept)
        director = SchoolDirectorFactory(school=school, education_department=None)

        res = _client(director).get(URL)

        assert res.status_code == 200
        assert res.data["municipality_name"] == "Olinda"

    def test_no_academic_year_returns_nulls(self):
        dept = EducationDepartmentFactory(municipality_name="Recife")
        admin = SMEAdminFactory(education_department=dept)

        res = _client(admin).get(URL)

        assert res.status_code == 200
        assert res.data["municipality_name"] == "Recife"
        assert res.data["academic_year"] is None
        assert res.data["term"] is None

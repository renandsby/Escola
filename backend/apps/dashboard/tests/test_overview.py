"""Testes do endpoint /api/v1/dashboard/overview/ (dashboard gerencial)."""

import pytest
from rest_framework.test import APIClient

from apps.students.tests.factories import (
    AcademicYearFactory,
    EducationDepartmentFactory,
    EnrollmentFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    StudentGuardianUserFactory,
    TeacherAllocationFactory,
    TeacherUserFactory,
    TransferRequestFactory,
)

URL = "/api/v1/dashboard/overview/"


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestAccess:
    def test_requires_authentication(self):
        assert _client().get(URL).status_code == 401

    def test_teacher_forbidden(self):
        assert _client(TeacherUserFactory()).get(URL).status_code == 403

    def test_guardian_forbidden(self):
        assert _client(StudentGuardianUserFactory()).get(URL).status_code == 403


@pytest.mark.django_db
class TestNetworkScope:
    def test_payload_shape_and_scope(self):
        dept = EducationDepartmentFactory()
        year = AcademicYearFactory(education_department=dept, status="ACTIVE")
        school_a = SchoolFactory(education_department=dept)
        SchoolFactory(education_department=dept)
        SchoolClassFactory(school=school_a, academic_year=year, max_capacity=20)

        res = _client(SMEAdminFactory(education_department=dept)).get(URL)

        assert res.status_code == 200
        body = res.data
        assert set(body) >= {
            "scope",
            "period",
            "kpis",
            "attendance_trend",
            "performance",
            "enrollment_by_stage",
            "movement",
            "diary_completeness",
            "needs_you",
        }
        assert body["scope"]["level"] == "network"
        assert body["scope"]["can_switch_to_school"] is True
        assert len(body["scope"]["schools"]) == 2
        assert body["period"]["academic_year"] == year.year
        # sem matrícula/nota → indicadores nulos (R4)
        assert body["kpis"]["active_enrollments"]["value"] == 0
        assert body["kpis"]["average_attendance"]["value"] is None
        assert body["attendance_trend"] is None
        assert body["performance"] is None
        assert body["enrollment_by_stage"]["occupancy_rate"] is None
        assert body["diary_completeness"]["group_by"] == "school"

    def test_kpi_pending_transfers_and_needs_you(self):
        dept = EducationDepartmentFactory()
        year = AcademicYearFactory(education_department=dept, status="ACTIVE")
        school = SchoolFactory(education_department=dept)
        SchoolClassFactory(school=school, academic_year=year)  # sem regente
        TransferRequestFactory(
            student=StudentFactory(education_department=dept),
            origin_school=school,
            academic_year=year,
            status="PENDING_SME",
        )

        res = _client(SMEAdminFactory(education_department=dept)).get(URL)

        assert res.data["kpis"]["pending_transfers"]["value"] == 1
        keys = {n["key"] for n in res.data["needs_you"]}
        assert "transfers" in keys
        assert "regent" in keys

    def test_scope_switch_to_school(self):
        dept = EducationDepartmentFactory()
        year = AcademicYearFactory(education_department=dept, status="ACTIVE")
        school_a = SchoolFactory(education_department=dept)
        school_b = SchoolFactory(education_department=dept)
        SchoolClassFactory(school=school_a, academic_year=year)
        SchoolClassFactory(school=school_b, academic_year=year)
        admin = SMEAdminFactory(education_department=dept)

        res = _client(admin).get(URL, {"scope": "school", "school_id": str(school_a.id)})
        assert res.data["scope"]["level"] == "school"
        assert res.data["scope"]["title"] == school_a.name
        assert res.data["diary_completeness"]["group_by"] == "class"


@pytest.mark.django_db
class TestSchoolScope:
    def test_director_locked_to_own_school(self):
        dept = EducationDepartmentFactory()
        year = AcademicYearFactory(education_department=dept, status="ACTIVE")
        school_a = SchoolFactory(education_department=dept)
        school_b = SchoolFactory(education_department=dept)
        class_a = SchoolClassFactory(school=school_a, academic_year=year, max_capacity=25)
        SchoolClassFactory(school=school_b, academic_year=year)
        EnrollmentFactory(
            student=StudentFactory(education_department=dept), school_class=class_a
        )
        TeacherAllocationFactory(school_class=class_a, is_regent=True)

        res = _client(SchoolDirectorFactory(school=school_a)).get(URL)

        assert res.status_code == 200
        assert res.data["scope"]["level"] == "school"
        assert res.data["scope"]["can_switch_to_school"] is False
        assert res.data["scope"]["schools"] == []
        assert res.data["kpis"]["active_enrollments"]["value"] == 1
        assert res.data["diary_completeness"]["group_by"] == "class"
        assert len(res.data["diary_completeness"]["rows"]) == 1
        assert res.data["diary_completeness"]["rows"][0]["status"] != "NO_TEACHER"

    def test_director_cannot_switch_to_other_school(self):
        dept = EducationDepartmentFactory()
        AcademicYearFactory(education_department=dept, status="ACTIVE")
        school_a = SchoolFactory(education_department=dept)
        school_b = SchoolFactory(education_department=dept)
        res = _client(SchoolDirectorFactory(school=school_a)).get(
            URL, {"scope": "network", "school_id": str(school_b.id)}
        )
        # continua travado na própria escola
        assert res.data["scope"]["level"] == "school"
        assert res.data["scope"]["title"] == school_a.name


@pytest.mark.django_db
class TestDiaryCompleteness:
    """A completude do diário deve trazer % de notas lançadas e frequência
    média reais por escola (regressão: antes vinha sempre null no nível rede)."""

    def _fixture(self):
        from apps.class_diary.tests.factories import (
            AcademicPeriodFactory,
            AttendanceFactory,
            GradeFactory,
        )
        from apps.curriculum.tests.factories import CurriculumMatrixItemFactory

        dept = EducationDepartmentFactory()
        year = AcademicYearFactory(education_department=dept, status="ACTIVE")
        period = AcademicPeriodFactory(academic_year=year, period_number=1)
        school = SchoolFactory(education_department=dept)
        klass = SchoolClassFactory(school=school, academic_year=year)
        # matriz com 2 disciplinas → 2 células esperadas por matrícula
        items = [
            CurriculumMatrixItemFactory(curriculum_matrix=klass.curriculum_matrix)
            for _ in range(2)
        ]
        TeacherAllocationFactory(school_class=klass, is_regent=True)
        enr = EnrollmentFactory(
            student=StudentFactory(education_department=dept), school_class=klass
        )
        # 1 das 2 células lançadas → 50 %
        GradeFactory(enrollment=enr, subject=items[0].subject, academic_period=period)
        # 8 presenças / 10 registros → 80 %
        for i in range(10):
            AttendanceFactory(
                enrollment=enr,
                school_class=klass,
                status="PRESENT" if i < 8 else "ABSENT",
            )
        return dept, school

    def test_network_rows_have_real_pct_and_attendance(self):
        dept, school = self._fixture()
        res = _client(SMEAdminFactory(education_department=dept)).get(URL)

        rows = res.data["diary_completeness"]["rows"]
        row = next(r for r in rows if r["id"] == str(school.id))
        assert row["grades_launched_pct"] == 50.0
        assert row["average_attendance"] == 80.0
        assert row["status"] == "LATE"  # regente ok, 40 <= 50 < 90

    def test_school_scope_rows_by_class_have_real_pct(self):
        dept, school = self._fixture()
        director = SchoolDirectorFactory(school=school, education_department=dept)
        res = _client(director).get(URL)

        data = res.data["diary_completeness"]
        assert data["group_by"] == "class"
        assert data["rows"][0]["grades_launched_pct"] == 50.0
        assert data["rows"][0]["average_attendance"] == 80.0

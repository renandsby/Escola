"""Testes de escopo (RBAC) dos selectors de dados de referência da governança."""

import pytest

from apps.governance.selectors.reference_data import (
    get_academic_periods_for_user,
    get_academic_years_for_user,
    get_education_departments_for_user,
    get_education_stages,
)

from .factories import (
    AcademicPeriodFactory,
    AcademicYearFactory,
    EducationDepartmentFactory,
    EducationStageFactory,
    SMEAdminFactory,
    SMESupervisorFactory,
)


@pytest.mark.django_db
class TestEducationDepartmentScope:
    def test_sme_admin_sees_only_own_department(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_education_departments_for_user(user=admin).values_list('id', flat=True))

        assert dept.id in ids
        assert other.id not in ids

    def test_supervisor_sees_only_own_department(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        supervisor = SMESupervisorFactory(education_department=dept)

        ids = set(get_education_departments_for_user(user=supervisor).values_list('id', flat=True))

        assert ids == {dept.id}
        assert other.id not in ids


@pytest.mark.django_db
class TestAcademicYearScope:
    def test_sme_admin_sees_department_wide(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        year_in = AcademicYearFactory(education_department=dept)
        year_out = AcademicYearFactory(education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_academic_years_for_user(user=admin).values_list('id', flat=True))

        assert year_in.id in ids
        assert year_out.id not in ids


@pytest.mark.django_db
class TestAcademicPeriodScope:
    def test_sme_admin_sees_department_wide(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        period_in = AcademicPeriodFactory(academic_year__education_department=dept)
        period_out = AcademicPeriodFactory(academic_year__education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_academic_periods_for_user(user=admin).values_list('id', flat=True))

        assert period_in.id in ids
        assert period_out.id not in ids


@pytest.mark.django_db
class TestEducationStageGlobal:
    def test_stages_are_global_reference_data(self):
        stage_a = EducationStageFactory()
        stage_b = EducationStageFactory()

        ids = set(get_education_stages().values_list('id', flat=True))

        assert {stage_a.id, stage_b.id} <= ids

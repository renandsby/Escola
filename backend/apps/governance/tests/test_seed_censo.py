"""Testes do comando seed_censo_igarassu (carga do Censo Escolar 2025)."""

import pytest
from django.core.management import call_command

from apps.classes.models import Classroom, SchoolClass
from apps.curriculum.models import CurriculumMatrix, Subject
from apps.governance.models import AcademicPeriod, AcademicYear, EducationDepartment
from apps.schools.models import School


@pytest.mark.django_db
class TestSeedCensoIgarassu:
    def test_loads_municipal_network(self):
        call_command("seed_censo_igarassu", "--no-admin")

        dept = EducationDepartment.objects.get(ibge_code="2606804")
        assert dept.municipality_name == "Igarassu"
        assert AcademicYear.objects.filter(education_department=dept, year=2025).exists()
        assert AcademicPeriod.objects.filter(academic_year__education_department=dept).count() == 4
        assert Subject.objects.filter(education_department=dept).count() == 9
        assert CurriculumMatrix.objects.filter(education_department=dept).count() == 4

        schools = School.objects.filter(education_department=dept)
        assert schools.count() == 49
        assert all(s.address_city == "Igarassu" and s.address_state == "PE" for s in schools)
        assert all(s.inep_code and len(s.inep_code) == 8 for s in schools)

        assert Classroom.objects.filter(school__education_department=dept).count() > 200
        assert SchoolClass.objects.filter(school__education_department=dept).count() > 400

    def test_is_idempotent(self):
        call_command("seed_censo_igarassu", "--no-admin")
        first = SchoolClass.objects.count(), School.objects.count(), Classroom.objects.count()

        call_command("seed_censo_igarassu", "--no-admin")
        second = SchoolClass.objects.count(), School.objects.count(), Classroom.objects.count()

        assert first == second

    def test_creates_admin_user_by_default(self):
        call_command("seed_censo_igarassu")

        from django.contrib.auth import get_user_model

        User = get_user_model()
        admin = User.objects.get(username="admin")
        assert admin.is_superuser
        assert admin.education_department.ibge_code == "2606804"

    def test_classes_have_valid_shift_and_matrix(self):
        call_command("seed_censo_igarassu", "--no-admin")

        for cls in SchoolClass.objects.select_related("curriculum_matrix")[:50]:
            assert cls.shift in {"MORNING", "AFTERNOON", "NIGHT", "FULL_TIME"}
            assert cls.curriculum_matrix_id is not None
            assert cls.max_capacity > 0

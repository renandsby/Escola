"""Testes de escopo (RBAC) dos selectors do domínio de currículo."""

import pytest

from apps.curriculum.selectors.matrices import (
    get_curriculum_matrices_for_user,
    get_curriculum_matrix_items_for_user,
)
from apps.curriculum.selectors.subjects import get_subjects_for_user

from .factories import (
    CurriculumMatrixFactory,
    CurriculumMatrixItemFactory,
    EducationDepartmentFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    SubjectFactory,
)


@pytest.mark.django_db
class TestSubjectScope:
    def test_sme_admin_sees_department_subjects(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        mine = SubjectFactory(education_department=dept)
        theirs = SubjectFactory(education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_subjects_for_user(user=admin).values_list('id', flat=True))

        assert mine.id in ids
        assert theirs.id not in ids

    def test_school_director_department_resolved_via_school(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        mine = SubjectFactory(education_department=dept)
        theirs = SubjectFactory(education_department=other)
        school = SchoolFactory(education_department=dept)
        director = SchoolDirectorFactory(school=school)

        ids = set(get_subjects_for_user(user=director).values_list('id', flat=True))

        assert mine.id in ids
        assert theirs.id not in ids


@pytest.mark.django_db
class TestCurriculumMatrixScope:
    def test_sme_admin_sees_department_matrices(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        mine = CurriculumMatrixFactory(education_department=dept)
        theirs = CurriculumMatrixFactory(education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_curriculum_matrices_for_user(user=admin).values_list('id', flat=True))

        assert mine.id in ids
        assert theirs.id not in ids

    def test_matrix_items_scoped_by_matrix_department(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        mine = CurriculumMatrixItemFactory(curriculum_matrix__education_department=dept)
        theirs = CurriculumMatrixItemFactory(curriculum_matrix__education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_curriculum_matrix_items_for_user(user=admin).values_list('id', flat=True))

        assert mine.id in ids
        assert theirs.id not in ids

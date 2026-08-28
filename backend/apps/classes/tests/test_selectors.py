"""Testes de escopo (RBAC) dos selectors do app apps.classes."""

import pytest

from apps.classes.selectors.school_classes import get_school_classes_for_user
from apps.classes.selectors.teachers import (
    get_teacher_allocations_for_user,
    get_teacher_profiles_for_user,
)

from .factories import (
    EducationDepartmentFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    TeacherAllocationFactory,
    TeacherProfileFactory,
    TeacherUserFactory,
)


@pytest.mark.django_db
class TestSchoolClassScope:
    def test_sme_admin_sees_department_wide(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        mine = SchoolClassFactory(school__education_department=dept)
        theirs = SchoolClassFactory(school__education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_school_classes_for_user(user=admin).values_list('id', flat=True))

        assert mine.id in ids
        assert theirs.id not in ids

    def test_school_director_sees_own_school_only(self):
        dept = EducationDepartmentFactory()
        school_a = SchoolFactory(education_department=dept)
        school_b = SchoolFactory(education_department=dept)
        class_a = SchoolClassFactory(school=school_a)
        class_b = SchoolClassFactory(school=school_b)
        director = SchoolDirectorFactory(school=school_a)

        ids = set(get_school_classes_for_user(user=director).values_list('id', flat=True))

        assert class_a.id in ids
        assert class_b.id not in ids

    def test_teacher_sees_only_allocated_classes(self):
        dept = EducationDepartmentFactory()
        school = SchoolFactory(education_department=dept)
        class_a = SchoolClassFactory(school=school)
        class_b = SchoolClassFactory(school=school)
        teacher = TeacherUserFactory(education_department=dept)
        profile = TeacherProfileFactory(user=teacher, education_department=dept)
        TeacherAllocationFactory(teacher_profile=profile, school_class=class_a)

        ids = set(get_school_classes_for_user(user=teacher).values_list('id', flat=True))

        assert class_a.id in ids
        assert class_b.id not in ids


@pytest.mark.django_db
class TestTeacherProfileScope:
    def test_sme_admin_sees_department_teachers(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        mine = TeacherProfileFactory(user__education_department=dept, education_department=dept)
        theirs = TeacherProfileFactory(user__education_department=other, education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_teacher_profiles_for_user(user=admin).values_list('id', flat=True))

        assert mine.id in ids
        assert theirs.id not in ids

    def test_teacher_sees_only_own_profile(self):
        dept = EducationDepartmentFactory()
        teacher = TeacherUserFactory(education_department=dept)
        own = TeacherProfileFactory(user=teacher, education_department=dept)
        TeacherProfileFactory(user__education_department=dept, education_department=dept)

        ids = set(get_teacher_profiles_for_user(user=teacher).values_list('id', flat=True))

        assert ids == {own.id}


@pytest.mark.django_db
class TestTeacherAllocationScope:
    def test_sme_admin_sees_department_allocations(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        mine = TeacherAllocationFactory(school_class__school__education_department=dept)
        theirs = TeacherAllocationFactory(school_class__school__education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_teacher_allocations_for_user(user=admin).values_list('id', flat=True))

        assert mine.id in ids
        assert theirs.id not in ids

    def test_director_sees_own_school_allocations(self):
        dept = EducationDepartmentFactory()
        school_a = SchoolFactory(education_department=dept)
        school_b = SchoolFactory(education_department=dept)
        alloc_a = TeacherAllocationFactory(school_class__school=school_a)
        alloc_b = TeacherAllocationFactory(school_class__school=school_b)
        director = SchoolDirectorFactory(school=school_a)

        ids = set(get_teacher_allocations_for_user(user=director).values_list('id', flat=True))

        assert alloc_a.id in ids
        assert alloc_b.id not in ids

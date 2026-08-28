"""Escopo (RBAC) do selector de usuários."""

import pytest

from apps.authentication.selectors.users import get_users_for_user
from apps.governance.tests.factories import EducationDepartmentFactory

from .factories import SchoolDirectorFactory, SMEAdminFactory, TeacherUserFactory, UserFactory


@pytest.mark.django_db
class TestGetUsersForUser:
    def test_sme_admin_sees_department_users(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        mine = UserFactory(education_department=dept)
        theirs = UserFactory(education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_users_for_user(user=admin).values_list('id', flat=True))

        assert mine.id in ids
        assert theirs.id not in ids
        assert admin.id in ids

    def test_director_sees_own_school_plus_self(self):
        director = SchoolDirectorFactory()
        same_school_user = UserFactory(school=director.school, education_department=None)
        other_user = UserFactory()

        ids = set(get_users_for_user(user=director).values_list('id', flat=True))

        assert director.id in ids
        assert same_school_user.id in ids
        assert other_user.id not in ids

    def test_teacher_sees_only_self(self):
        teacher = TeacherUserFactory()
        UserFactory(education_department=teacher.education_department)

        ids = set(get_users_for_user(user=teacher).values_list('id', flat=True))

        assert ids == {teacher.id}

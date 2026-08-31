"""Ramos de borda de `core/permissions.py`."""

import pytest
from rest_framework.test import APIRequestFactory

from core.permissions import (
    CanEditGrades,
    CanManageSchools,
    IsEmailVerified,
    IsSchoolOwner,
)
from apps.students.tests.factories import (
    GuardianFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    TeacherUserFactory,
)

pytestmark = pytest.mark.django_db
rf = APIRequestFactory()


class _Anon:
    is_authenticated = False


def _req(method="get", user=None):
    r = getattr(rf, method)("/x/")
    r.user = user if user is not None else _Anon()
    return r


class TestCanManageSchools:
    def test_anonymous_denied(self):
        assert CanManageSchools().has_permission(_req(), None) is False

    def test_school_staff_read_only(self):
        director = SchoolDirectorFactory()
        assert CanManageSchools().has_permission(_req("get", director), None) is True
        assert CanManageSchools().has_permission(_req("post", director), None) is False

    def test_sme_admin_can_write(self):
        admin = SMEAdminFactory()
        assert CanManageSchools().has_permission(_req("post", admin), None) is True


class TestCanEditGrades:
    def test_anonymous_denied(self):
        assert CanEditGrades().has_permission(_req(), None) is False

    def test_read_open_write_restricted(self):
        teacher = TeacherUserFactory()
        guardian = GuardianFactory().user
        assert CanEditGrades().has_permission(_req("get", guardian), None) is True
        assert CanEditGrades().has_permission(_req("post", teacher), None) is True
        assert CanEditGrades().has_permission(_req("post", guardian), None) is False


class TestIsSchoolOwner:
    def test_object_level_matches_school(self):
        school = SchoolFactory()
        director = SchoolDirectorFactory(school=school, education_department=None)
        mine = SchoolClassFactory(school=school)
        theirs = SchoolClassFactory()

        perm = IsSchoolOwner()
        assert perm.has_permission(_req("get", director), None) is True
        assert perm.has_object_permission(_req("get", director), None, mine) is True
        assert perm.has_object_permission(_req("get", director), None, theirs) is False

    def test_user_without_school_denied(self):
        admin = SMEAdminFactory()
        assert IsSchoolOwner().has_object_permission(
            _req("get", admin), None, SchoolClassFactory()
        ) is False

    def test_object_without_school_denied(self):
        director = SchoolDirectorFactory()

        class _Bare:
            pass

        assert IsSchoolOwner().has_object_permission(
            _req("get", director), None, _Bare()
        ) is False


class TestIsEmailVerified:
    def test_anonymous_denied(self):
        assert IsEmailVerified().has_permission(_req(), None) is False

    def test_staff_passes_through(self):
        assert IsEmailVerified().has_permission(
            _req("get", SMEAdminFactory()), None
        ) is True

    def test_legacy_guardian_grandfathered(self):
        assert IsEmailVerified().has_permission(
            _req("get", GuardianFactory().user), None
        ) is True

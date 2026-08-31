"""Ramos de borda de `core/scopes.py::apply_scope` (RBAC hierárquico)."""

import pytest

from core.scopes import apply_scope
from apps.students.models import Student
from apps.students.tests.factories import (
    EducationDepartmentFactory,
    GuardianFactory,
    SchoolDirectorFactory,
    SMEAdminFactory,
    StudentFactory,
    TeacherUserFactory,
)

pytestmark = pytest.mark.django_db


class _Anon:
    is_authenticated = False


def _qs():
    return Student.objects.all()


def test_anonymous_gets_nothing():
    assert apply_scope(_qs(), _Anon(), department_field="education_department_id").count() == 0


def test_sme_without_department_gets_nothing():
    admin = SMEAdminFactory(education_department=None)
    assert apply_scope(_qs(), admin, department_field="education_department_id").count() == 0


def test_school_staff_without_school_gets_nothing():
    director = SchoolDirectorFactory(school=None, education_department=None)
    assert apply_scope(_qs(), director, school_field="id").count() == 0


def test_sme_missing_lookup_returns_none():
    dept = EducationDepartmentFactory()
    StudentFactory(education_department=dept)
    admin = SMEAdminFactory(education_department=dept)
    # department_field não informado -> qs.none()
    assert apply_scope(_qs(), admin, school_field="id").count() == 0


def test_teacher_without_lookup_and_without_profile():
    teacher = TeacherUserFactory()
    assert apply_scope(_qs(), teacher, student_field="id").count() == 0  # teacher_class_field None
    # com o campo, mas professor sem alocação -> vazio
    assert apply_scope(_qs(), teacher, teacher_class_field="enrollments__school_class_id").count() == 0


def test_guardian_callable_lookup_is_used():
    guardian = GuardianFactory()
    mine = StudentFactory()
    guardian.student_links.create(student=mine, kinship_type="MOTHER", status="CONFIRMED")
    StudentFactory()  # de outra família

    called = {}

    def _only_mine(qs, user):
        called["hit"] = True
        return qs.filter(id=mine.id)

    result = apply_scope(_qs(), guardian.user, student_field=_only_mine)
    assert called["hit"] is True
    assert list(result.values_list("id", flat=True)) == [mine.id]


def test_guardian_pending_link_grants_no_access():
    guardian = GuardianFactory()
    pending = StudentFactory()
    guardian.student_links.create(student=pending, kinship_type="MOTHER", status="PENDING")
    result = apply_scope(_qs(), guardian.user, student_field="id")
    assert result.count() == 0


def test_unknown_role_gets_nothing():
    user = TeacherUserFactory()
    user.role = "mystery"
    assert apply_scope(_qs(), user, teacher_class_field="id").count() == 0

"""P2-GUARDIAN — portal do responsável e múltiplos dependentes."""

import pytest
from rest_framework.test import APIClient

from apps.students.tests.factories import (
    EnrollmentFactory,
    GuardianFactory,
    StudentFactory,
    StudentGuardianFactory,
)
from apps.class_diary.tests.factories import GradeFactory

pytestmark = pytest.mark.django_db

URL = '/api/v1/guardians/my-dependents/'


@pytest.fixture
def guardian_two_kids(db):
    dept_student = StudentFactory()
    guardian = GuardianFactory(user__education_department=dept_student.education_department)
    e1 = EnrollmentFactory(student=dept_student)
    kid2 = StudentFactory(education_department=dept_student.education_department)
    e2 = EnrollmentFactory(student=kid2)
    StudentGuardianFactory(student=dept_student, guardian=guardian)
    StudentGuardianFactory(student=kid2, guardian=guardian)
    GradeFactory(enrollment=e1, score=7)
    GradeFactory(enrollment=e2, score=5)
    return guardian.user, dept_student, kid2


def test_guardian_sees_both_dependents_with_individual_data(guardian_two_kids):
    guardian_user, kid1, kid2 = guardian_two_kids
    client = APIClient()
    client.force_authenticate(guardian_user)

    resp = client.get(URL)
    assert resp.status_code == 200
    by_id = {row['student_id']: row for row in resp.data}
    assert set(by_id) == {str(kid1.id), str(kid2.id)}
    assert by_id[str(kid1.id)]['grade_average'] == 7.0
    assert by_id[str(kid2.id)]['grade_average'] == 5.0
    assert by_id[str(kid1.id)]['school_class'] is not None


def test_non_guardian_gets_empty_summary(guardian_two_kids):
    from apps.students.tests.factories import SchoolDirectorFactory

    client = APIClient()
    client.force_authenticate(SchoolDirectorFactory())
    resp = client.get(URL)
    assert resp.status_code == 200
    assert resp.data == []


def test_guardian_cannot_pull_unrelated_student_boletim(guardian_two_kids):
    guardian_user, _, _ = guardian_two_kids
    outsider = StudentFactory()
    client = APIClient()
    client.force_authenticate(guardian_user)

    resp = client.get('/api/v1/reports/boletim_pdf/', {'student_id': str(outsider.id)})
    assert resp.status_code in (403, 404)

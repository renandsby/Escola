"""Testes do endpoint /api/v1/dashboard/summary/."""

import pytest
from rest_framework.test import APIClient

from apps.classes.tests.factories import (
    EducationDepartmentFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
)
from apps.curriculum.tests.factories import SubjectFactory


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestDashboardSummary:
    URL = "/api/v1/dashboard/summary/"

    def test_requires_authentication(self):
        assert _client().get(self.URL).status_code == 401

    def test_counts_reflect_database_scoped_to_role(self):
        dept = EducationDepartmentFactory()
        other = EducationDepartmentFactory()
        school_a = SchoolFactory(education_department=dept)
        SchoolFactory(education_department=dept)
        SchoolFactory(education_department=other)  # fora do escopo
        SchoolClassFactory(school=school_a)
        SubjectFactory(education_department=dept)
        SubjectFactory(education_department=other)
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get(self.URL)

        assert response.status_code == 200
        assert response.data["schools"] == 2
        assert response.data["school_classes"] == 1
        assert response.data["subjects"] == 1
        assert response.data["subjects"] == 1
        assert set(response.data) == {
            "students",
            "enrollments",
            "school_classes",
            "subjects",
            "schools",
            "teachers",
        }

    def test_school_director_only_sees_own_school(self):
        dept = EducationDepartmentFactory()
        school_a = SchoolFactory(education_department=dept)
        school_b = SchoolFactory(education_department=dept)
        SchoolClassFactory(school=school_a)
        SchoolClassFactory(school=school_b)
        director = SchoolDirectorFactory(school=school_a)

        response = _client(director).get(self.URL)

        assert response.status_code == 200
        assert response.data["schools"] == 1
        assert response.data["school_classes"] == 1

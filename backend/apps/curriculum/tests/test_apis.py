"""Testes de integração dos endpoints de currículo (contratos ``/api/v1/subjects/``
e ``/api/v1/curriculum/``, ambos congelados)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.curriculum.models import Subject

from .factories import (
    CurriculumMatrixFactory,
    CurriculumMatrixItemFactory,
    EducationDepartmentFactory,
    SMEAdminFactory,
    SubjectFactory,
)


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestSubjectAPI:
    URL = '/api/v1/subjects/'

    def test_list_requires_authentication(self):
        assert _client().get(self.URL).status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_scoped_to_department(self):
        dept = EducationDepartmentFactory()
        SubjectFactory(education_department=dept)
        SubjectFactory(education_department=EducationDepartmentFactory())
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get(self.URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

    def test_create_subject(self):
        dept = EducationDepartmentFactory()
        admin = SMEAdminFactory(education_department=dept)
        payload = {
            'education_department': str(dept.id),
            'name': 'História',
            'area_of_knowledge': 'Ciências Humanas',
        }

        response = _client(admin).post(self.URL, payload)

        assert response.status_code == status.HTTP_201_CREATED
        assert Subject.objects.filter(name='História', education_department=dept).exists()

    def test_also_served_under_sme_prefix(self):
        dept = EducationDepartmentFactory()
        SubjectFactory(education_department=dept)
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get('/api/v1/sme/subjects/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1


@pytest.mark.django_db
class TestCurriculumMatrixAPI:
    def test_matrices_listed_with_items(self):
        dept = EducationDepartmentFactory()
        item = CurriculumMatrixItemFactory(curriculum_matrix__education_department=dept)
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get('/api/v1/curriculum/matrices/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

    def test_matrix_items_endpoint(self):
        dept = EducationDepartmentFactory()
        CurriculumMatrixItemFactory(curriculum_matrix__education_department=dept)
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get('/api/v1/curriculum/matrix-items/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

    def test_matrices_also_under_sme_prefix(self):
        dept = EducationDepartmentFactory()
        CurriculumMatrixFactory(education_department=dept)
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get('/api/v1/sme/curriculum-matrices/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

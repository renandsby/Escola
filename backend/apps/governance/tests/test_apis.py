"""Testes de integração dos endpoints da governança (contrato ``/api/v1/sme/``)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.governance.models import EducationDepartment

from .factories import (
    AcademicPeriodFactory,
    AcademicYearFactory,
    EducationDepartmentFactory,
    EducationStageFactory,
    SMEAdminFactory,
    SMESupervisorFactory,
)


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestEducationDepartmentAPI:
    URL = '/api/v1/sme/departments/'

    def test_list_requires_authentication(self):
        assert _client().get(self.URL).status_code == status.HTTP_401_UNAUTHORIZED

    def test_sme_admin_lists_only_own_department(self):
        dept = EducationDepartmentFactory()
        EducationDepartmentFactory()
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get(self.URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['id'] == str(dept.id)

    def test_supervisor_cannot_create_department(self):
        supervisor = SMESupervisorFactory(education_department=EducationDepartmentFactory())
        payload = {'municipality_name': 'Nova Cidade', 'ibge_code': '3599999'}

        response = _client(supervisor).post(self.URL, payload)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_sme_admin_can_create_department(self):
        admin = SMEAdminFactory(education_department=EducationDepartmentFactory())
        payload = {'municipality_name': 'Nova Cidade', 'ibge_code': '3599999'}

        response = _client(admin).post(self.URL, payload)

        assert response.status_code == status.HTTP_201_CREATED
        assert EducationDepartment.objects.filter(ibge_code='3599999').exists()

    def test_indicators_action(self):
        dept = EducationDepartmentFactory()
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get(f'{self.URL}{dept.id}/indicators/')

        assert response.status_code == status.HTTP_200_OK
        assert 'schools_count' in response.data
        assert 'students_count' in response.data


@pytest.mark.django_db
class TestAcademicYearAPI:
    URL = '/api/v1/sme/academic-years/'

    def test_scoped_to_department(self):
        dept = EducationDepartmentFactory()
        AcademicYearFactory(education_department=dept)
        AcademicYearFactory(education_department=EducationDepartmentFactory())
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get(self.URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1


@pytest.mark.django_db
class TestAcademicPeriodAPI:
    URL = '/api/v1/sme/academic-periods/'

    def test_scoped_to_department(self):
        dept = EducationDepartmentFactory()
        AcademicPeriodFactory(academic_year__education_department=dept)
        AcademicPeriodFactory(academic_year__education_department=EducationDepartmentFactory())
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get(self.URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1


@pytest.mark.django_db
class TestEducationStageAPI:
    def test_served_on_both_frozen_url_prefixes(self):
        stage = EducationStageFactory()
        admin = SMEAdminFactory(education_department=EducationDepartmentFactory())

        for url in ('/api/v1/sme/stages/', '/api/v1/curriculum/stages/'):
            response = _client(admin).get(url)
            assert response.status_code == status.HTTP_200_OK
            assert any(row['id'] == str(stage.id) for row in response.data['results'])

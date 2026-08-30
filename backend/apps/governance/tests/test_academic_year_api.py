"""Testes do CRUD de anos letivos (``/api/v1/sme/academic-years/``)."""

from datetime import date

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.governance.models import AcademicYear

from .factories import (
    AcademicYearFactory,
    EducationDepartmentFactory,
    SMEAdminFactory,
    SMESupervisorFactory,
)

URL = '/api/v1/sme/academic-years/'


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.fixture
def department(db):
    return EducationDepartmentFactory()


@pytest.fixture
def admin(department):
    return SMEAdminFactory(education_department=department)


def _payload(department, **overrides):
    data = {
        'education_department': str(department.id),
        'year': 2030,
        'status': 'PLANNED',
        'start_date': '2030-02-01',
        'end_date': '2030-12-15',
    }
    data.update(overrides)
    return data


@pytest.mark.django_db
class TestCreate:
    def test_admin_creates_valid_year(self, admin, department):
        response = _client(admin).post(URL, _payload(department))

        assert response.status_code == status.HTTP_201_CREATED
        assert AcademicYear.objects.filter(year=2030, education_department=department).exists()

    def test_supervisor_cannot_create(self, department):
        supervisor = SMESupervisorFactory(education_department=department)

        response = _client(supervisor).post(URL, _payload(department))

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rejects_end_before_start(self, admin, department):
        response = _client(admin).post(
            URL, _payload(department, start_date='2030-12-01', end_date='2030-02-01')
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'VALIDATION_ERROR'

    def test_rejects_start_date_year_mismatch(self, admin, department):
        response = _client(admin).post(
            URL, _payload(department, year=2030, start_date='2029-02-01')
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'start_date' in response.data['error']['details']


@pytest.mark.django_db
class TestUpdate:
    def test_admin_updates_planned_year(self, admin, department):
        year = AcademicYearFactory(
            education_department=department, year=2031, status='PLANNED',
            start_date=date(2031, 2, 1), end_date=date(2031, 12, 1),
        )

        response = _client(admin).patch(f'{URL}{year.id}/', {'end_date': '2031-12-20'})

        assert response.status_code == status.HTTP_200_OK
        year.refresh_from_db()
        assert year.end_date == date(2031, 12, 20)

    def test_cannot_edit_closed_year(self, admin, department):
        year = AcademicYearFactory(
            education_department=department, year=2029, status='CLOSED',
            start_date=date(2029, 2, 1), end_date=date(2029, 12, 1),
        )

        response = _client(admin).patch(f'{URL}{year.id}/', {'end_date': '2029-12-20'})

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestDelete:
    def test_admin_deletes_year_without_dependencies(self, admin, department):
        year = AcademicYearFactory(education_department=department, year=2032, status='PLANNED')

        response = _client(admin).delete(f'{URL}{year.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not AcademicYear.objects.filter(id=year.id).exists()

    def test_cannot_delete_closed_year(self, admin, department):
        year = AcademicYearFactory(education_department=department, year=2028, status='CLOSED')

        response = _client(admin).delete(f'{URL}{year.id}/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'YEAR_ALREADY_CLOSED'

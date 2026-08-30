"""Testes do CRUD de períodos letivos (``/api/v1/sme/academic-periods/``)."""

from datetime import date

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.governance.models import AcademicPeriod

from .factories import (
    AcademicPeriodFactory,
    AcademicYearFactory,
    EducationDepartmentFactory,
    SMEAdminFactory,
    SMESupervisorFactory,
)

URL = '/api/v1/sme/academic-periods/'


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


@pytest.fixture
def year(department):
    return AcademicYearFactory(
        education_department=department, year=2030, status='ACTIVE',
        start_date=date(2030, 2, 1), end_date=date(2030, 12, 15),
    )


def _payload(year, **overrides):
    data = {
        'academic_year': str(year.id),
        'name': '1º Bimestre',
        'period_number': 1,
        'start_date': '2030-02-01',
        'end_date': '2030-04-10',
        'grade_deadline': '2030-04-17',
    }
    data.update(overrides)
    return data


@pytest.mark.django_db
class TestCreate:
    def test_admin_creates_valid_period(self, admin, year):
        response = _client(admin).post(URL, _payload(year))

        assert response.status_code == status.HTTP_201_CREATED
        assert AcademicPeriod.objects.filter(academic_year=year, period_number=1).exists()

    def test_supervisor_cannot_create(self, department, year):
        supervisor = SMESupervisorFactory(education_department=department)

        response = _client(supervisor).post(URL, _payload(year))

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rejects_period_outside_year(self, admin, year):
        response = _client(admin).post(
            URL, _payload(year, start_date='2030-01-05', end_date='2030-04-10')
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'start_date' in response.data['error']['details']

    def test_rejects_deadline_before_end(self, admin, year):
        response = _client(admin).post(
            URL, _payload(year, end_date='2030-04-10', grade_deadline='2030-04-05')
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'grade_deadline' in response.data['error']['details']

    def test_rejects_duplicate_period_number(self, admin, year):
        AcademicPeriodFactory(
            academic_year=year, period_number=1, name='1º Bim',
            start_date=date(2030, 2, 1), end_date=date(2030, 4, 10),
            grade_deadline=date(2030, 4, 17),
        )

        response = _client(admin).post(URL, _payload(year, period_number=1))

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'period_number' in response.data['error']['details']

    def test_rejects_period_on_closed_year(self, admin, department):
        closed = AcademicYearFactory(
            education_department=department, year=2027, status='CLOSED',
            start_date=date(2027, 2, 1), end_date=date(2027, 12, 15),
        )

        response = _client(admin).post(
            URL,
            _payload(
                closed,
                start_date='2027-02-01',
                end_date='2027-04-10',
                grade_deadline='2027-04-17',
            ),
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestListUpdateDelete:
    def test_list_filtered_by_year(self, admin, year, department):
        AcademicPeriodFactory(
            academic_year=year, period_number=2, name='2º Bim',
            start_date=date(2030, 4, 20), end_date=date(2030, 6, 30),
            grade_deadline=date(2030, 7, 7),
        )
        other_year = AcademicYearFactory(education_department=department, year=2031)
        AcademicPeriodFactory(academic_year=other_year, period_number=1)

        response = _client(admin).get(URL, {'academic_year': str(year.id)})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

    def test_admin_updates_period(self, admin, year):
        period = AcademicPeriodFactory(
            academic_year=year, period_number=1, name='1º Bim',
            start_date=date(2030, 2, 1), end_date=date(2030, 4, 10),
            grade_deadline=date(2030, 4, 17),
        )

        response = _client(admin).patch(f'{URL}{period.id}/', {'name': '1º Bimestre'})

        assert response.status_code == status.HTTP_200_OK
        period.refresh_from_db()
        assert period.name == '1º Bimestre'

    def test_admin_deletes_period(self, admin, year):
        period = AcademicPeriodFactory(
            academic_year=year, period_number=3, name='3º Bim',
            start_date=date(2030, 8, 1), end_date=date(2030, 9, 30),
            grade_deadline=date(2030, 10, 7),
        )

        response = _client(admin).delete(f'{URL}{period.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not AcademicPeriod.objects.filter(id=period.id).exists()

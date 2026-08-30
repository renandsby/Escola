"""P2-CLASS-CRUD — criação/edição de turmas e salas com escopo por escola."""

import pytest
from rest_framework.test import APIClient

from apps.classes.models import Classroom, SchoolClass
from apps.classes.tests.factories import (
    CurriculumMatrixFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
)
from apps.governance.tests.factories import AcademicYearFactory

pytestmark = pytest.mark.django_db


def _details(resp):
    """Campos de erro no envelope {success:false, error:{details:{...}}}."""
    body = resp.data
    if isinstance(body, dict) and 'error' in body:
        return body['error'].get('details') or {}
    return body


def _class_payload(school):
    year = AcademicYearFactory(education_department=school.education_department)
    matrix = CurriculumMatrixFactory(education_department=school.education_department)
    return {
        'school': str(school.id),
        'academic_year': str(year.id),
        'curriculum_matrix': str(matrix.id),
        'name': '1º Ano A',
        'shift': 'MORNING',
        'max_capacity': 25,
    }


def test_director_creates_class_for_own_school():
    school = SchoolFactory()
    director = SchoolDirectorFactory(school=school)
    client = APIClient()
    client.force_authenticate(director)

    resp = client.post('/api/v1/classes/', _class_payload(school), format='json')
    assert resp.status_code == 201, resp.data
    assert SchoolClass.objects.filter(school=school, name='1º Ano A').exists()


def test_director_cannot_create_class_for_other_school():
    own = SchoolFactory()
    other = SchoolFactory(education_department=own.education_department)
    director = SchoolDirectorFactory(school=own)
    client = APIClient()
    client.force_authenticate(director)

    resp = client.post('/api/v1/classes/', _class_payload(other), format='json')
    assert resp.status_code == 400
    assert 'school' in _details(resp)


def test_class_capacity_must_be_positive():
    school = SchoolFactory()
    admin = SMEAdminFactory(education_department=school.education_department)
    client = APIClient()
    client.force_authenticate(admin)

    payload = _class_payload(school)
    payload['max_capacity'] = 0
    resp = client.post('/api/v1/classes/', payload, format='json')
    assert resp.status_code == 400
    assert 'max_capacity' in _details(resp)


def test_director_creates_classroom_for_own_school_and_capacity_validation():
    school = SchoolFactory()
    director = SchoolDirectorFactory(school=school)
    client = APIClient()
    client.force_authenticate(director)

    ok = client.post(
        '/api/v1/classrooms/',
        {'school': str(school.id), 'number': '12', 'capacity': 30, 'floor': 1},
        format='json',
    )
    assert ok.status_code == 201, ok.data
    assert Classroom.objects.filter(school=school, number='12').exists()

    bad = client.post(
        '/api/v1/classrooms/',
        {'school': str(school.id), 'number': '13', 'capacity': -5, 'floor': 1},
        format='json',
    )
    assert bad.status_code == 400
    assert 'capacity' in _details(bad)


def test_classroom_list_is_scoped_to_school():
    a = SchoolFactory()
    b = SchoolFactory(education_department=a.education_department)
    Classroom.objects.create(school=a, number='A1', capacity=20, floor=1)
    Classroom.objects.create(school=b, number='B1', capacity=20, floor=1)

    director = SchoolDirectorFactory(school=a)
    client = APIClient()
    client.force_authenticate(director)
    resp = client.get('/api/v1/classrooms/')
    numbers = {row['number'] for row in resp.data['results']}
    assert numbers == {'A1'}


def test_director_edits_only_own_class():
    own = SchoolFactory()
    other_class = SchoolClassFactory()
    director = SchoolDirectorFactory(school=own)
    client = APIClient()
    client.force_authenticate(director)

    resp = client.patch(
        f'/api/v1/classes/{other_class.id}/', {'name': 'Hackeada'}, format='json'
    )
    assert resp.status_code in (403, 404)

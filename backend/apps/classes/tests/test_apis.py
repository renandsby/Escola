"""Testes de integração dos endpoints de apps.classes (URLs congeladas:
/api/v1/classes/, /api/v1/classrooms/, /api/v1/teachers/, /api/v1/sme/teachers/)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.classes.models import TeacherAllocation

from .factories import (
    ClassroomFactory,
    EducationDepartmentFactory,
    SchoolClassFactory,
    SchoolFactory,
    SMEAdminFactory,
    TeacherProfileFactory,
)


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestSchoolClassAPI:
    def test_list_requires_authentication(self):
        assert _client().get('/api/v1/classes/').status_code == status.HTTP_401_UNAUTHORIZED

    def test_scoped_to_department(self):
        dept = EducationDepartmentFactory()
        SchoolClassFactory(school__education_department=dept)
        SchoolClassFactory(school__education_department=EducationDepartmentFactory())
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get('/api/v1/classes/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

    def test_soft_delete(self):
        dept = EducationDepartmentFactory()
        school_class = SchoolClassFactory(school__education_department=dept)
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).delete(f'/api/v1/classes/{school_class.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        school_class.refresh_from_db()
        assert school_class.deleted_at is not None


@pytest.mark.django_db
class TestClassroomAPI:
    def test_list(self):
        dept = EducationDepartmentFactory()
        ClassroomFactory(school__education_department=dept)
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).get('/api/v1/classrooms/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1


@pytest.mark.django_db
class TestTeacherAPI:
    def test_profiles_on_frozen_prefixes(self):
        dept = EducationDepartmentFactory()
        TeacherProfileFactory(user__education_department=dept, education_department=dept)
        admin = SMEAdminFactory(education_department=dept)

        for url in ('/api/v1/teachers/', '/api/v1/sme/teachers/'):
            response = _client(admin).get(url)
            assert response.status_code == status.HTTP_200_OK
            assert response.data['count'] == 1


@pytest.mark.django_db
class TestTeacherAllocationAPI:
    URL = '/api/v1/teachers/allocations/'

    def test_create_allocation_via_service(self):
        dept = EducationDepartmentFactory()
        teacher = TeacherProfileFactory(user__education_department=dept, education_department=dept)
        school_class = SchoolClassFactory(school__education_department=dept)
        admin = SMEAdminFactory(education_department=dept)

        response = _client(admin).post(
            self.URL,
            {'teacher_profile': str(teacher.id), 'school_class': str(school_class.id)},
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert TeacherAllocation.objects.filter(teacher_profile=teacher).count() == 1

    def test_schedule_conflict_returns_business_error(self):
        dept = EducationDepartmentFactory()
        school = SchoolFactory(education_department=dept)
        teacher = TeacherProfileFactory(user__education_department=dept, education_department=dept)
        class_a = SchoolClassFactory(school=school, shift='MORNING')
        class_b = SchoolClassFactory(
            school=school, academic_year=class_a.academic_year, shift='MORNING'
        )
        admin = SMEAdminFactory(education_department=dept)
        _client(admin).post(
            self.URL, {'teacher_profile': str(teacher.id), 'school_class': str(class_a.id)}
        )

        response = _client(admin).post(
            self.URL, {'teacher_profile': str(teacher.id), 'school_class': str(class_b.id)}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'TEACHER_SCHEDULE_CONFLICT'

    def test_allocations_require_sme_staff(self):
        dept = EducationDepartmentFactory()
        teacher_user = TeacherProfileFactory(
            user__education_department=dept, education_department=dept
        ).user

        response = _client(teacher_user).get(self.URL)

        assert response.status_code == status.HTTP_403_FORBIDDEN

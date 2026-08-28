import pytest

from apps.schools.selectors.schools import get_schools_for_user

from .factories import EducationDepartmentFactory, SchoolDirectorFactory, SchoolFactory, SMEAdminFactory


@pytest.mark.django_db
class TestGetSchoolsForUser:
    def test_sme_admin_sees_department_schools(self):
        dept = EducationDepartmentFactory()
        mine = SchoolFactory(education_department=dept)
        theirs = SchoolFactory(education_department=EducationDepartmentFactory())
        admin = SMEAdminFactory(education_department=dept)

        ids = set(get_schools_for_user(user=admin).values_list('id', flat=True))

        assert mine.id in ids
        assert theirs.id not in ids

    def test_director_sees_only_own_school(self):
        dept = EducationDepartmentFactory()
        school_a = SchoolFactory(education_department=dept)
        school_b = SchoolFactory(education_department=dept)
        director = SchoolDirectorFactory(school=school_a)

        ids = set(get_schools_for_user(user=director).values_list('id', flat=True))

        assert ids == {school_a.id}
        assert school_b.id not in ids


@pytest.mark.django_db
class TestSchoolAPI:
    def test_list_scoped(self):
        from rest_framework.test import APIClient

        dept = EducationDepartmentFactory()
        SchoolFactory(education_department=dept)
        SchoolFactory(education_department=EducationDepartmentFactory())
        admin = SMEAdminFactory(education_department=dept)
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.get('/api/v1/schools/')

        assert response.status_code == 200
        assert response.data['count'] == 1

    def test_soft_delete(self):
        from rest_framework.test import APIClient

        dept = EducationDepartmentFactory()
        school = SchoolFactory(education_department=dept)
        admin = SMEAdminFactory(education_department=dept)
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.delete(f'/api/v1/schools/{school.id}/')

        assert response.status_code == 204
        school.refresh_from_db()
        assert school.deleted_at is not None

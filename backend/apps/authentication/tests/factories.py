"""Factories do app apps.authentication."""

import factory
from django.contrib.auth import get_user_model

from apps.governance.tests.factories import EducationDepartmentFactory
from apps.classes.tests.factories import SchoolFactory
from core.models import UserRole

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'auth_user_{n}')
    email = factory.LazyAttribute(lambda o: f'{o.username}@example.com')
    password = 'testpass123'
    role = UserRole.STUDENT_GUARDIAN
    is_active = True
    education_department = factory.SubFactory(EducationDepartmentFactory)
    school = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return cls._get_manager(model_class).create_user(*args, **kwargs)


class SMEAdminFactory(UserFactory):
    role = UserRole.SME_ADMIN
    is_staff = True


class SchoolDirectorFactory(UserFactory):
    role = UserRole.SCHOOL_DIRECTOR
    education_department = None
    school = factory.SubFactory(SchoolFactory)


class TeacherUserFactory(UserFactory):
    role = UserRole.TEACHER

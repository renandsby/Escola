"""Factories do app consolidado apps.classes (turmas, salas, docência)."""

from datetime import date

import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory

from apps.curriculum.tests.factories import (  # noqa: F401
    CurriculumMatrixFactory,
    EducationDepartmentFactory,
    SubjectFactory,
)
from apps.governance.tests.factories import AcademicYearFactory
from core.models import UserRole
from core.validators import next_generated_cpf

User = get_user_model()


def _digits(n: int) -> str:
    return ''.join(str((i * 7) % 10) for i in range(n))


class SchoolFactory(DjangoModelFactory):
    class Meta:
        model = 'schools.School'

    education_department = factory.SubFactory(EducationDepartmentFactory)
    inep_code = factory.Sequence(lambda n: f'{35000000 + n:08d}')
    name = factory.Sequence(lambda n: f'Escola Municipal {n}')
    cnpj = factory.Sequence(lambda n: f'{10000000000000 + n:014d}')
    school_type = 'FUNDAMENTAL_1'
    email = factory.Sequence(lambda n: f'escola{n}@rede.gov.br')
    phone = '(11) 3333-4444'
    address_street = 'Rua Teste'
    address_number = '100'
    address_neighborhood = factory.Sequence(lambda n: f'Bairro {n}')
    address_city = 'São Paulo'
    address_state = 'SP'
    address_zip_code = factory.Sequence(lambda n: f'{1000000 + n:08d}')


class ClassroomFactory(DjangoModelFactory):
    class Meta:
        model = 'classes.Classroom'

    school = factory.SubFactory(SchoolFactory)
    number = factory.Sequence(lambda n: f'{n + 1}')
    capacity = 30
    floor = 1
    building = 'Bloco A'


class SchoolClassFactory(DjangoModelFactory):
    class Meta:
        model = 'classes.SchoolClass'

    school = factory.SubFactory(SchoolFactory)
    academic_year = factory.SubFactory(
        AcademicYearFactory,
        education_department=factory.SelfAttribute('..school.education_department'),
    )
    curriculum_matrix = factory.SubFactory(
        CurriculumMatrixFactory,
        education_department=factory.SelfAttribute('..school.education_department'),
    )
    name = factory.Sequence(lambda n: f'Turma {n}')
    shift = 'MORNING'
    max_capacity = 30


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    cpf = factory.LazyFunction(next_generated_cpf)
    username = factory.LazyAttribute(lambda o: o.cpf)
    email = factory.LazyAttribute(lambda o: f'u{o.cpf}@example.com')
    password = 'testpass123'
    role = UserRole.SME_ADMIN
    is_active = True
    education_department = factory.SubFactory(EducationDepartmentFactory)
    school = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        manager = cls._get_manager(model_class)
        return manager.create_user(*args, **kwargs)


class SMEAdminFactory(UserFactory):
    role = UserRole.SME_ADMIN


class SMESupervisorFactory(UserFactory):
    role = UserRole.SME_SUPERVISOR


class SchoolDirectorFactory(UserFactory):
    role = UserRole.SCHOOL_DIRECTOR
    education_department = None
    school = factory.SubFactory(SchoolFactory)


class TeacherUserFactory(UserFactory):
    role = UserRole.TEACHER


class TeacherProfileFactory(DjangoModelFactory):
    class Meta:
        model = 'classes.TeacherProfile'

    user = factory.SubFactory(TeacherUserFactory)
    education_department = factory.SelfAttribute('user.education_department')
    registration_number = factory.Sequence(lambda n: f'PROF{n:05d}')
    cpf = factory.LazyFunction(next_generated_cpf)
    formation_area = 'Pedagogia'
    birth_date = date(1990, 1, 15)
    hiring_date = date(2020, 2, 1)


class TeacherAllocationFactory(DjangoModelFactory):
    class Meta:
        model = 'classes.TeacherAllocation'

    teacher_profile = factory.SubFactory(TeacherProfileFactory)
    school_class = factory.SubFactory(SchoolClassFactory)
    subject = None
    is_regent = False

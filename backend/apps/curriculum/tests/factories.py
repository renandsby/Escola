"""Factories do app apps.curriculum (disciplinas e matrizes curriculares)."""

import factory
from factory.django import DjangoModelFactory

from apps.governance.tests.factories import (  # noqa: F401 - re-export para conveniência
    EducationDepartmentFactory,
    EducationStageFactory,
    SMEAdminFactory,
    SMESupervisorFactory,
    UserFactory,
)
from core.models import UserRole


class SubjectFactory(DjangoModelFactory):
    class Meta:
        model = 'curriculum.Subject'

    education_department = factory.SubFactory(EducationDepartmentFactory)
    name = factory.Sequence(lambda n: f'Disciplina {n}')
    bncc_code = factory.Sequence(lambda n: f'BNCC{n:03d}')
    area_of_knowledge = 'Linguagens'


class CurriculumMatrixFactory(DjangoModelFactory):
    class Meta:
        model = 'curriculum.CurriculumMatrix'

    education_department = factory.SubFactory(EducationDepartmentFactory)
    education_stage = factory.SubFactory(EducationStageFactory)
    name = factory.Sequence(lambda n: f'Matriz Curricular {n}')


class CurriculumMatrixItemFactory(DjangoModelFactory):
    class Meta:
        model = 'curriculum.CurriculumMatrixItem'

    curriculum_matrix = factory.SubFactory(CurriculumMatrixFactory)
    subject = factory.SubFactory(
        SubjectFactory,
        education_department=factory.SelfAttribute('..curriculum_matrix.education_department'),
    )
    weekly_hours = 5
    annual_hours = 200


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


class SchoolDirectorFactory(UserFactory):
    role = UserRole.SCHOOL_DIRECTOR
    education_department = None
    school = factory.SubFactory(SchoolFactory)

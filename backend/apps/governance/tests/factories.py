"""Factories do app apps.governance (SME: departamento, ano/período letivo, etapa)."""

from datetime import date, timedelta
from decimal import Decimal

import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory

from core.models import UserRole
from core.validators import next_generated_cpf

User = get_user_model()


class EducationDepartmentFactory(DjangoModelFactory):
    class Meta:
        model = 'governance.EducationDepartment'

    municipality_name = factory.Sequence(lambda n: f'Município Teste {n}')
    ibge_code = factory.Sequence(lambda n: f'{3550000 + n:07d}')
    secretary_name = factory.Faker('name', locale='pt_BR')
    min_passing_grade = Decimal('6.00')
    min_attendance_percentage = Decimal('75.00')


class AcademicYearFactory(DjangoModelFactory):
    class Meta:
        model = 'governance.AcademicYear'

    education_department = factory.SubFactory(EducationDepartmentFactory)
    year = factory.Sequence(lambda n: 2025 + (n % 10))
    status = 'ACTIVE'
    start_date = factory.LazyAttribute(lambda o: date(o.year, 2, 1))
    end_date = factory.LazyAttribute(lambda o: date(o.year, 12, 15))


class AcademicPeriodFactory(DjangoModelFactory):
    class Meta:
        model = 'governance.AcademicPeriod'

    academic_year = factory.SubFactory(AcademicYearFactory)
    name = factory.Sequence(lambda n: f'{(n % 4) + 1}º Bimestre')
    period_number = factory.Sequence(lambda n: (n % 4) + 1)
    start_date = factory.LazyAttribute(lambda o: date(o.academic_year.year, 2, 1))
    end_date = factory.LazyAttribute(lambda o: o.start_date + timedelta(days=60))
    grade_deadline = factory.LazyAttribute(lambda o: o.end_date + timedelta(days=7))


class EducationStageFactory(DjangoModelFactory):
    class Meta:
        model = 'governance.EducationStage'

    name = factory.Sequence(lambda n: f'Etapa {n}')
    code = factory.Sequence(lambda n: f'STG{n:03d}')
    stage_type = 'FUNDAMENTAL_I'
    evaluation_type = 'NUMERIC'


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

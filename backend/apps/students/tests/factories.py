"""Factories para o app consolidado apps.students (alunos, responsáveis, matrículas)."""

from datetime import date, timedelta
from decimal import Decimal

import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory
from faker import Faker

from core.models import UserRole
from apps.students.models import Enrollment, Guardian, Student, StudentGuardian, TransferRequest

fake = Faker('pt_BR')
User = get_user_model()


def _digits(n: int) -> str:
    return ''.join(str(fake.random_digit()) for _ in range(n))


# ---------------------------------------------------------------------------
# SME / suporte
# ---------------------------------------------------------------------------


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


class EducationStageFactory(DjangoModelFactory):
    class Meta:
        model = 'governance.EducationStage'

    name = factory.Sequence(lambda n: f'Etapa {n}')
    code = factory.Sequence(lambda n: f'STG{n:03d}')
    stage_type = 'FUNDAMENTAL_I'
    evaluation_type = 'NUMERIC'


class CurriculumMatrixFactory(DjangoModelFactory):
    class Meta:
        model = 'curriculum.CurriculumMatrix'

    education_department = factory.SubFactory(EducationDepartmentFactory)
    education_stage = factory.SubFactory(EducationStageFactory)
    name = factory.Sequence(lambda n: f'Matriz Curricular {n}')


class SchoolFactory(DjangoModelFactory):
    class Meta:
        model = 'schools.School'

    education_department = factory.SubFactory(EducationDepartmentFactory)
    inep_code = factory.Sequence(lambda n: f'{35000000 + n:08d}')
    name = factory.Sequence(lambda n: f'Escola Municipal {n}')
    cnpj = factory.LazyFunction(lambda: _digits(14))
    school_type = 'FUNDAMENTAL_1'
    email = factory.Faker('email')
    phone = factory.LazyFunction(lambda: fake.numerify('(##) ####-####'))
    address_street = factory.Faker('street_name', locale='pt_BR')
    address_number = factory.LazyFunction(lambda: str(fake.building_number()))
    address_neighborhood = factory.Sequence(lambda n: f'Bairro {n}')
    address_city = factory.Faker('city', locale='pt_BR')
    address_state = 'SP'
    address_zip_code = factory.LazyFunction(lambda: _digits(8))


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user_{n}')
    email = factory.LazyAttribute(lambda o: f'{o.username}@example.com')
    first_name = factory.Faker('first_name', locale='pt_BR')
    last_name = factory.Faker('last_name', locale='pt_BR')
    password = 'testpass123'
    role = UserRole.STUDENT_GUARDIAN
    is_active = True
    education_department = factory.SubFactory(EducationDepartmentFactory)
    school = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        manager = cls._get_manager(model_class)
        return manager.create_user(*args, **kwargs)


class SMEAdminFactory(UserFactory):
    role = UserRole.SME_ADMIN
    is_staff = True
    is_superuser = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        manager = cls._get_manager(model_class)
        return manager.create_superuser(*args, **kwargs)


class SMESupervisorFactory(UserFactory):
    role = UserRole.SME_SUPERVISOR


class SchoolDirectorFactory(UserFactory):
    role = UserRole.SCHOOL_DIRECTOR


class SchoolSecretaryFactory(UserFactory):
    role = UserRole.SCHOOL_SECRETARY


class TeacherUserFactory(UserFactory):
    role = UserRole.TEACHER


class StudentGuardianUserFactory(UserFactory):
    role = UserRole.STUDENT_GUARDIAN


# ---------------------------------------------------------------------------
# Teachers / Classes
# ---------------------------------------------------------------------------


class TeacherProfileFactory(DjangoModelFactory):
    class Meta:
        model = 'classes.TeacherProfile'

    user = factory.SubFactory(TeacherUserFactory)
    education_department = factory.SelfAttribute('user.education_department')
    registration_number = factory.Sequence(lambda n: f'PROF{n:05d}')
    cpf = factory.LazyFunction(lambda: _digits(11))
    formation_area = 'Pedagogia'
    birth_date = date(1990, 1, 15)
    hiring_date = date(2020, 2, 1)


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
    name = factory.Sequence(lambda n: f'{5}º Ano {chr(65 + (n % 26))}')
    shift = 'MORNING'
    max_capacity = 30
    room_number = factory.Sequence(lambda n: str(n + 1))


class TeacherAllocationFactory(DjangoModelFactory):
    class Meta:
        model = 'classes.TeacherAllocation'

    teacher_profile = factory.SubFactory(TeacherProfileFactory)
    school_class = factory.SubFactory(SchoolClassFactory)
    subject = None
    is_regent = False


# ---------------------------------------------------------------------------
# Students, Guardians, Enrollments, Transfers
# ---------------------------------------------------------------------------


class StudentFactory(DjangoModelFactory):
    class Meta:
        model = Student

    education_department = factory.SubFactory(EducationDepartmentFactory)
    user = factory.SubFactory(
        StudentGuardianUserFactory,
        education_department=factory.SelfAttribute('..education_department'),
    )
    unique_municipal_id = factory.Sequence(lambda n: f'MUN{n:08d}')
    full_name = factory.Faker('name', locale='pt_BR')
    mother_name = factory.Faker('name', locale='pt_BR')
    birth_date = date(2015, 3, 10)
    gender = 'M'
    cpf = factory.LazyFunction(lambda: _digits(11))


class GuardianFactory(DjangoModelFactory):
    class Meta:
        model = Guardian

    user = factory.SubFactory(StudentGuardianUserFactory)
    full_name = factory.Faker('name', locale='pt_BR')
    cpf = factory.LazyFunction(lambda: _digits(11))
    phone = factory.LazyFunction(lambda: fake.numerify('(##) #####-####'))
    email = factory.Faker('email')
    address = factory.Faker('street_address', locale='pt_BR')
    occupation = factory.Faker('job', locale='pt_BR')


class StudentGuardianFactory(DjangoModelFactory):
    class Meta:
        model = StudentGuardian

    student = factory.SubFactory(StudentFactory)
    guardian = factory.SubFactory(GuardianFactory)
    kinship_type = 'MOTHER'
    is_emergency_contact = True


class EnrollmentFactory(DjangoModelFactory):
    class Meta:
        model = Enrollment

    student = factory.SubFactory(StudentFactory)
    school_class = factory.LazyAttribute(
        lambda o: SchoolClassFactory(school__education_department=o.student.education_department)
    )
    academic_year = factory.LazyAttribute(lambda o: o.school_class.academic_year)
    enrollment_number = factory.Sequence(lambda n: f'ENR{n:08d}')
    status = 'ENROLLED'


class TransferRequestFactory(DjangoModelFactory):
    class Meta:
        model = TransferRequest

    student = factory.SubFactory(StudentFactory)
    origin_school = factory.SubFactory(
        SchoolFactory,
        education_department=factory.SelfAttribute('..student.education_department'),
    )
    destination_school = None
    academic_year = factory.SubFactory(
        AcademicYearFactory,
        education_department=factory.SelfAttribute('..student.education_department'),
    )
    reason = factory.Faker('sentence', locale='pt_BR')
    status = 'PENDING_SME'

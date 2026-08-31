"""Factories para o app consolidado apps.class_diary (diário, notas, frequência,
pareceres descritivos e histórico escolar)."""

from datetime import date, timedelta
from decimal import Decimal

import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory
from faker import Faker

from core.models import UserRole
from core.validators import next_generated_cpf
from apps.class_diary.models import Attendance, DescriptiveEvaluation, DiaryEntry, Grade, SchoolHistory

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


class AcademicPeriodFactory(DjangoModelFactory):
    class Meta:
        model = 'governance.AcademicPeriod'

    academic_year = factory.SubFactory(AcademicYearFactory)
    name = factory.Sequence(lambda n: f'{n + 1}º Bimestre')
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

    cpf = factory.LazyFunction(next_generated_cpf)
    username = factory.LazyAttribute(lambda o: o.cpf)
    email = factory.LazyAttribute(lambda o: f'u{o.cpf}@example.com')
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
# Teachers / Subjects / Classes / Students / Enrollment
# ---------------------------------------------------------------------------


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


class SubjectFactory(DjangoModelFactory):
    class Meta:
        model = 'curriculum.Subject'

    education_department = factory.SubFactory(EducationDepartmentFactory)
    name = factory.Sequence(lambda n: f'Disciplina {n}')
    bncc_code = factory.Sequence(lambda n: f'BNCC{n:03d}')
    area_of_knowledge = 'Linguagens'
    minimum_passing_grade = Decimal('6.00')


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


class StudentFactory(DjangoModelFactory):
    class Meta:
        model = 'students.Student'

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
    cpf = factory.LazyFunction(next_generated_cpf)


class EnrollmentFactory(DjangoModelFactory):
    class Meta:
        model = 'students.Enrollment'

    student = factory.SubFactory(StudentFactory)
    school_class = factory.LazyAttribute(
        lambda o: SchoolClassFactory(school__education_department=o.student.education_department)
    )
    academic_year = factory.LazyAttribute(lambda o: o.school_class.academic_year)
    enrollment_number = factory.Sequence(lambda n: f'ENR{n:08d}')
    status = 'ENROLLED'


# ---------------------------------------------------------------------------
# Diary / Grades / Attendance / Evaluations / History
# ---------------------------------------------------------------------------


class DiaryEntryFactory(DjangoModelFactory):
    class Meta:
        model = DiaryEntry

    school_class = factory.SubFactory(SchoolClassFactory)
    subject = factory.SubFactory(
        SubjectFactory,
        education_department=factory.SelfAttribute('..school_class.school.education_department'),
    )
    teacher = factory.SubFactory(
        TeacherProfileFactory,
        education_department=factory.SelfAttribute('..school_class.school.education_department'),
    )
    content = factory.Faker('paragraph', locale='pt_BR')
    homework = ''
    observations = ''


class GradeFactory(DjangoModelFactory):
    class Meta:
        model = Grade

    enrollment = factory.SubFactory(EnrollmentFactory)
    subject = factory.SubFactory(
        SubjectFactory,
        education_department=factory.SelfAttribute('..enrollment.student.education_department'),
    )
    academic_period = factory.SubFactory(
        AcademicPeriodFactory,
        academic_year=factory.SelfAttribute('..enrollment.school_class.academic_year'),
    )
    teacher = factory.SubFactory(
        TeacherUserFactory,
        education_department=factory.SelfAttribute('..enrollment.student.education_department'),
    )
    score = Decimal('8.50')
    assessment_type = 'PERIOD_EXAM'


class AttendanceFactory(DjangoModelFactory):
    class Meta:
        model = Attendance

    enrollment = factory.SubFactory(EnrollmentFactory)
    school_class = factory.SelfAttribute('enrollment.school_class')
    subject = None
    date = factory.LazyFunction(lambda: date.today())
    status = 'PRESENT'
    justification_note = ''


class DescriptiveEvaluationFactory(DjangoModelFactory):
    class Meta:
        model = DescriptiveEvaluation

    enrollment = factory.SubFactory(EnrollmentFactory)
    academic_period = factory.SubFactory(
        AcademicPeriodFactory,
        academic_year=factory.SelfAttribute('..enrollment.school_class.academic_year'),
    )
    teacher = factory.SubFactory(
        TeacherUserFactory,
        education_department=factory.SelfAttribute('..enrollment.student.education_department'),
    )
    development_report = factory.Faker('paragraph', locale='pt_BR')
    learning_milestones = factory.LazyFunction(dict)


class SchoolHistoryFactory(DjangoModelFactory):
    class Meta:
        model = SchoolHistory

    student = factory.SubFactory(StudentFactory)
    total_classes = 100
    absences = 5
    attendance_percentage = 95.0
    overall_average = 8.0
    final_status = 'pending'

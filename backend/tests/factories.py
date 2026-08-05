import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from faker import Faker

fake = Faker('pt_BR')
User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory para criar usuários."""

    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user_{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    password = 'testpass123'
    role = 'student'
    is_active = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        manager = cls._get_manager(model_class)
        return manager.create_user(*args, **kwargs)


class AdminUserFactory(UserFactory):
    """Factory para criar usuários admin."""

    is_staff = True
    is_superuser = True
    role = 'admin'

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        manager = cls._get_manager(model_class)
        return manager.create_superuser(*args, **kwargs)


class SchoolFactory(DjangoModelFactory):
    """Factory para criar escolas."""

    class Meta:
        model = 'schools.School'

    name = factory.Faker('company')
    cnpj = factory.LazyFunction(lambda: fake.cnpj())
    email = factory.Faker('email')
    phone = factory.LazyFunction(lambda: fake.phone_number())
    website = factory.Faker('url')
    address = factory.Faker('address')


class StudentFactory(UserFactory):
    """Factory para criar alunos."""

    role = 'student'


class TeacherFactory(UserFactory):
    """Factory para criar professores."""

    role = 'teacher'


class GuardianFactory(UserFactory):
    """Factory para criar responsáveis."""

    role = 'guardian'


class SubjectFactory(DjangoModelFactory):
    """Factory para criar disciplinas."""

    class Meta:
        model = 'subjects.Subject'

    name = factory.Faker('word')
    code = factory.Sequence(lambda n: f'DISC{n:03d}')
    school = factory.SubFactory(SchoolFactory)


class ClassFactory(DjangoModelFactory):
    """Factory para criar turmas."""

    class Meta:
        model = 'classes.Class'

    name = factory.Faker('word')
    code = factory.Sequence(lambda n: f'TURMA{n:03d}')
    school = factory.SubFactory(SchoolFactory)
    year = 2024
    semester = 1


class ClassroomFactory(DjangoModelFactory):
    """Factory para criar salas de aula."""

    class Meta:
        model = 'classrooms.Classroom'

    name = factory.Sequence(lambda n: f'Sala {n}')
    capacity = 30
    resources = 'Quadro, Projetor'
    school = factory.SubFactory(SchoolFactory)


class ClassDetailFactory(DjangoModelFactory):
    """Factory para criar turmas com relacionamentos."""

    class Meta:
        model = 'classes.Class'

    name = factory.Sequence(lambda n: f'{n}º Ano A')
    grade_level = factory.Iterator([1, 2, 3, 4, 5, 6, 7, 8, 9])
    teacher = factory.SubFactory(TeacherFactory)
    classroom = factory.SubFactory(ClassroomFactory)
    school = factory.SelfAttribute('teacher.school')
    year = 2024


class EnrollmentFactory(DjangoModelFactory):
    """Factory para criar matrículas."""

    class Meta:
        model = 'enrollments.Enrollment'

    student = factory.SubFactory(StudentFactory)
    class_obj = factory.SubFactory(ClassDetailFactory)
    school = factory.SubFactory(SchoolFactory)
    enrollment_date = factory.Faker('date_object')
    status = 'active'


class GradeFactory(DjangoModelFactory):
    """Factory para criar notas."""

    class Meta:
        model = 'grades.Grade'

    student = factory.SubFactory(StudentFactory)
    class_obj = factory.SubFactory(ClassDetailFactory)
    subject = factory.SubFactory(SubjectFactory)
    first_period = 8.5
    second_period = 7.8
    third_period = 9.0
    fourth_period = 8.2
    school = factory.SubFactory(SchoolFactory)


class AttendanceFactory(DjangoModelFactory):
    """Factory para criar frequência."""

    class Meta:
        model = 'attendance.Attendance'

    student = factory.SubFactory(StudentFactory)
    class_obj = factory.SubFactory(ClassDetailFactory)
    date = factory.Faker('date_object')
    status = factory.Iterator(['present', 'absent', 'justified'])
    school = factory.SubFactory(SchoolFactory)

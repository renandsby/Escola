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


class EnrollmentFactory(DjangoModelFactory):
    """Factory para criar matrículas."""

    class Meta:
        model = 'enrollments.Enrollment'

    student = factory.SubFactory(StudentFactory)
    school = factory.SubFactory(SchoolFactory)
    enrollment_date = factory.Faker('date_object')
    status = 'active'

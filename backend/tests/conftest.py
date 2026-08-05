import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.schools.models import School
from tests.factories import (
    UserFactory, AdminUserFactory, SchoolFactory, StudentFactory,
    TeacherFactory, GuardianFactory, SubjectFactory, ClassDetailFactory,
    EnrollmentFactory, GradeFactory, AttendanceFactory, ClassroomFactory
)

User = get_user_model()


@pytest.fixture
def api_client():
    """Retorna um cliente API."""
    return APIClient()


@pytest.fixture
def user(db):
    """Cria um usuário teste."""
    return UserFactory(username='testuser', email='test@example.com')


@pytest.fixture
def authenticated_client(db, user):
    """Retorna um cliente API autenticado."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin_user(db):
    """Cria um usuário admin."""
    return AdminUserFactory(username='admin', email='admin@example.com')


@pytest.fixture
def admin_client(db, admin_user):
    """Retorna um cliente API autenticado como admin."""
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def school(db):
    """Cria uma escola teste."""
    return SchoolFactory(name='Escola Teste', cnpj='12.345.678/0001-00')


@pytest.fixture
def user_with_school(db, school):
    """Cria um usuário com escola."""
    return UserFactory(username='schooluser', email='schooluser@example.com', school=school, role='director')


@pytest.fixture
def authenticated_school_client(db, user_with_school):
    """Retorna um cliente API autenticado com escola."""
    client = APIClient()
    client.force_authenticate(user=user_with_school)
    return client


@pytest.fixture
def teacher(db, school):
    """Cria um professor."""
    return TeacherFactory(school=school)


@pytest.fixture
def student(db, school):
    """Cria um aluno."""
    return StudentFactory(school=school)


@pytest.fixture
def guardian(db, school, student):
    """Cria um responsável e o vincula a um aluno."""
    guardian_obj = GuardianFactory(school=school)
    guardian_obj.students.add(student.user)
    return guardian_obj


@pytest.fixture
def subject(db, school):
    """Cria uma disciplina."""
    return SubjectFactory(school=school)


@pytest.fixture
def classroom(db, school):
    """Cria uma sala de aula."""
    return ClassroomFactory(school=school)


@pytest.fixture
def class_obj(db, teacher, classroom, school, subject):
    """Cria uma turma com professor e sala."""
    klass = ClassDetailFactory(teacher=teacher, classroom=classroom, school=school)
    klass.subjects.add(subject)
    return klass


@pytest.fixture
def enrollment(db, student, class_obj):
    """Cria uma matrícula."""
    return EnrollmentFactory(student=student.user, class_obj=class_obj, school=class_obj.school)


@pytest.fixture
def grade(db, student, class_obj, subject):
    """Cria uma nota."""
    return GradeFactory(student=student.user, class_obj=class_obj, subject=subject, school=class_obj.school)


@pytest.fixture
def attendance(db, student, class_obj):
    """Cria um registro de frequência."""
    return AttendanceFactory(student=student.user, class_obj=class_obj, school=class_obj.school)

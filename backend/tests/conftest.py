"""Fixtures pytest para o domínio SME."""

import pytest
from rest_framework.test import APIClient

from core.models import UserRole
from tests.factories import (
    AcademicPeriodFactory,
    AcademicYearFactory,
    AttendanceFactory,
    CurriculumMatrixFactory,
    EducationDepartmentFactory,
    EducationStageFactory,
    EnrollmentFactory,
    GradeFactory,
    SchoolClassFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    StudentGuardianUserFactory,
    SubjectFactory,
    TeacherAllocationFactory,
    TeacherProfileFactory,
    TeacherUserFactory,
    UserFactory,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def department(db):
    return EducationDepartmentFactory(municipality_name='São Paulo Teste', ibge_code='3550399')


@pytest.fixture
def academic_year(db, department):
    return AcademicYearFactory(education_department=department, year=2026)


@pytest.fixture
def academic_period(db, academic_year):
    return AcademicPeriodFactory(
        academic_year=academic_year,
        name='1º Bimestre',
        period_number=1,
    )


@pytest.fixture
def education_stage(db):
    return EducationStageFactory(code='EF_AI_TEST', name='Fundamental Anos Iniciais')


@pytest.fixture
def curriculum_matrix(db, department, education_stage):
    return CurriculumMatrixFactory(
        education_department=department,
        education_stage=education_stage,
        name='Matriz EF AI',
    )


@pytest.fixture
def school(db, department):
    return SchoolFactory(
        education_department=department,
        name='Escola Teste',
        school_type='FUNDAMENTAL_1',
    )


@pytest.fixture
def school_b(db, department):
    return SchoolFactory(
        education_department=department,
        name='Escola Secundária',
        school_type='FUNDAMENTAL_1',
    )


@pytest.fixture
def user(db, department):
    return UserFactory(
        username='testuser',
        email='test@example.com',
        education_department=department,
        role=UserRole.STUDENT_GUARDIAN,
    )


@pytest.fixture
def admin_user(db, department):
    return SMEAdminFactory(
        username='admin',
        email='admin@example.com',
        education_department=department,
    )


@pytest.fixture
def authenticated_client(db, user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin_client(db, admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def teacher_user(db, department):
    return TeacherUserFactory(
        username='professor',
        email='professor@example.com',
        education_department=department,
    )


@pytest.fixture
def teacher_profile(db, teacher_user, department):
    return TeacherProfileFactory(
        user=teacher_user,
        education_department=department,
    )


@pytest.fixture
def teacher(teacher_profile):
    """Alias: perfil docente."""
    return teacher_profile


@pytest.fixture
def student_user(db, department, school):
    return StudentGuardianUserFactory(
        username='aluno',
        email='aluno@example.com',
        education_department=department,
        school=school,
    )


@pytest.fixture
def student(db, department, student_user):
    return StudentFactory(
        education_department=department,
        user=student_user,
        full_name='Aluno Teste',
        mother_name='Mãe Teste',
        unique_municipal_id='MUN00009999',
    )


@pytest.fixture
def other_student(db, department):
    return StudentFactory(
        education_department=department,
        full_name='Outro Aluno',
        mother_name='Outra Mãe',
        unique_municipal_id='MUN00008888',
    )


@pytest.fixture
def subject(db, department):
    return SubjectFactory(
        education_department=department,
        name='Matemática',
        bncc_code='MAT',
        area_of_knowledge='Matemática',
    )


@pytest.fixture
def school_class(db, school, academic_year, curriculum_matrix):
    return SchoolClassFactory(
        school=school,
        academic_year=academic_year,
        curriculum_matrix=curriculum_matrix,
        name='5º Ano A',
    )


@pytest.fixture
def school_class_b(db, school_b, academic_year, curriculum_matrix):
    return SchoolClassFactory(
        school=school_b,
        academic_year=academic_year,
        curriculum_matrix=curriculum_matrix,
        name='5º Ano B',
    )


@pytest.fixture
def class_obj(school_class):
    """Alias legado."""
    return school_class


@pytest.fixture
def teacher_allocation(db, teacher_profile, school_class, subject):
    return TeacherAllocationFactory(
        teacher_profile=teacher_profile,
        school_class=school_class,
        subject=subject,
    )


@pytest.fixture
def enrollment(db, student, school_class):
    return EnrollmentFactory(
        student=student,
        school_class=school_class,
        enrollment_number='ENR-TEST-001',
        status='ENROLLED',
    )


@pytest.fixture
def other_enrollment(db, other_student, school_class_b):
    return EnrollmentFactory(
        student=other_student,
        school_class=school_class_b,
        enrollment_number='ENR-TEST-002',
        status='ENROLLED',
    )


@pytest.fixture
def grade(db, enrollment, subject, academic_period, teacher_user):
    return GradeFactory(
        enrollment=enrollment,
        subject=subject,
        academic_period=academic_period,
        teacher=teacher_user,
        score='8.50',
    )


@pytest.fixture
def other_grade(db, other_enrollment, subject, academic_period, teacher_user):
    return GradeFactory(
        enrollment=other_enrollment,
        subject=subject,
        academic_period=academic_period,
        teacher=teacher_user,
        score='7.00',
    )


@pytest.fixture
def attendance(db, enrollment, school_class):
    return AttendanceFactory(
        enrollment=enrollment,
        school_class=school_class,
        subject=None,
        status='PRESENT',
    )


@pytest.fixture
def student_client(db, student_user):
    client = APIClient()
    client.force_authenticate(user=student_user)
    return client


@pytest.fixture
def teacher_client(db, teacher_user, teacher_allocation):
    """Cliente autenticado como professor (com alocação criada)."""
    client = APIClient()
    client.force_authenticate(user=teacher_user)
    return client

import pytest
from django.contrib.auth import get_user_model
from datetime import date

User = get_user_model()


@pytest.mark.django_db
class TestSchoolModel:
    """Testes para o modelo School."""

    def test_create_school(self, school):
        """Teste criação de escola."""
        assert school.name == 'Escola Teste'
        assert school.cnpj == '12.345.678/0001-00'
        assert school.is_active is True

    def test_school_string_representation(self, school):
        """Teste representação de string da escola."""
        assert str(school) == school.name


@pytest.mark.django_db
class TestUserModel:
    """Testes para o modelo User."""

    def test_create_user(self, user):
        """Teste criação de usuário."""
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.role == 'student'
        assert user.is_active is True

    def test_user_string_representation(self, user):
        """Teste representação de string do usuário."""
        assert str(user) == user.get_full_name()

    def test_user_check_password(self, user):
        """Teste verificação de senha."""
        assert user.check_password('testpass123')
        assert not user.check_password('wrongpass')

    def test_admin_user(self, admin_user):
        """Teste criação de usuário admin."""
        assert admin_user.is_staff is True
        assert admin_user.is_superuser is True
        assert admin_user.role == 'admin'


@pytest.mark.django_db
class TestStudentModel:
    """Testes para o modelo Student."""

    def test_create_student(self, student):
        """Teste criação de aluno."""
        assert student.user.role == 'student'
        assert student.registration_number is not None
        assert student.is_active is True

    def test_student_birth_date(self, student):
        """Teste data de nascimento do aluno."""
        assert isinstance(student.birth_date, date)
        assert student.birth_date is not None

    def test_student_cpf(self, student):
        """Teste CPF do aluno."""
        assert student.cpf is not None


@pytest.mark.django_db
class TestTeacherModel:
    """Testes para o modelo Teacher."""

    def test_create_teacher(self, teacher):
        """Teste criação de professor."""
        assert teacher.user.role == 'teacher'
        assert teacher.is_active is True

    def test_teacher_cpf(self, teacher):
        """Teste CPF do professor."""
        assert teacher.cpf is not None


@pytest.mark.django_db
class TestSubjectModel:
    """Testes para o modelo Subject."""

    def test_create_subject(self, subject):
        """Teste criação de disciplina."""
        assert subject.name is not None
        assert subject.code is not None
        assert subject.is_active is True

    def test_subject_string_representation(self, subject):
        """Teste representação de string da disciplina."""
        assert str(subject) == subject.name


@pytest.mark.django_db
class TestClassModel:
    """Testes para o modelo Class."""

    def test_create_class(self, class_obj):
        """Teste criação de turma."""
        assert class_obj.name is not None
        assert class_obj.teacher is not None
        assert class_obj.classroom is not None
        assert class_obj.is_active is True

    def test_class_has_subjects(self, class_obj, subject):
        """Teste se turma tem disciplinas."""
        assert subject in class_obj.subjects.all()


@pytest.mark.django_db
class TestEnrollmentModel:
    """Testes para o modelo Enrollment."""

    def test_create_enrollment(self, enrollment):
        """Teste criação de matrícula."""
        assert enrollment.student is not None
        assert enrollment.class_obj is not None
        assert enrollment.status == 'active'
        assert enrollment.is_active is True

    def test_enrollment_student_and_class_match(self, enrollment):
        """Teste se aluno e turma estão relacionados."""
        assert enrollment.student.role == 'student'


@pytest.mark.django_db
class TestGradeModel:
    """Testes para o modelo Grade."""

    def test_create_grade(self, grade):
        """Teste criação de nota."""
        assert grade.student is not None
        assert grade.class_obj is not None
        assert grade.subject is not None
        assert grade.first_period is not None

    def test_grade_average_calculation(self, grade):
        """Teste cálculo automático de média."""
        assert grade.average is not None
        expected_avg = (grade.first_period + grade.second_period +
                       grade.third_period + grade.fourth_period) / 4
        assert abs(float(grade.average) - float(expected_avg)) < 0.01

    def test_grade_status(self, grade):
        """Teste determinação do status de aprovação."""
        assert grade.status in ['approved', 'failed', 'pending']


@pytest.mark.django_db
class TestAttendanceModel:
    """Testes para o modelo Attendance."""

    def test_create_attendance(self, attendance):
        """Teste criação de frequência."""
        assert attendance.student is not None
        assert attendance.class_obj is not None
        assert attendance.date is not None
        assert attendance.status in ['present', 'absent', 'justified']

    def test_attendance_status_choices(self, attendance):
        """Teste valores válidos de status."""
        valid_statuses = ['present', 'absent', 'justified']
        assert attendance.status in valid_statuses

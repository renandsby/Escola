import pytest
from apps.schools.serializers import SchoolSerializer
from apps.students.serializers import StudentSerializer
from apps.subjects.serializers import SubjectSerializer
from apps.grades.serializers import GradeSerializer
from apps.attendance.serializers import AttendanceSerializer
from apps.classes.serializers import ClassSerializer


@pytest.mark.django_db
class TestSchoolSerializer:
    """Testes para SchoolSerializer."""

    def test_serialize_school(self, school):
        """Teste serialização de escola."""
        serializer = SchoolSerializer(school)
        assert serializer.data['name'] == school.name
        assert serializer.data['cnpj'] == school.cnpj
        assert 'id' in serializer.data

    def test_deserialize_school(self):
        """Teste desserialização de escola."""
        data = {
            'name': 'Nova Escola',
            'cnpj': '11.222.333/0001-00',
            'email': 'escola@example.com'
        }
        serializer = SchoolSerializer(data=data)
        assert serializer.is_valid()

    def test_invalid_school_data(self):
        """Teste desserialização com dados inválidos."""
        data = {
            'name': '',  # Campo obrigatório vazio
            'cnpj': '11.222.333/0001-00'
        }
        serializer = SchoolSerializer(data=data)
        assert not serializer.is_valid()


@pytest.mark.django_db
class TestStudentSerializer:
    """Testes para StudentSerializer."""

    def test_serialize_student(self, student):
        """Teste serialização de aluno."""
        serializer = StudentSerializer(student)
        assert 'id' in serializer.data
        assert 'user' in serializer.data or 'user_name' in serializer.data

    def test_student_registration_number(self, student):
        """Teste que aluno tem número de matrícula."""
        serializer = StudentSerializer(student)
        assert 'registration_number' in serializer.data


@pytest.mark.django_db
class TestSubjectSerializer:
    """Testes para SubjectSerializer."""

    def test_serialize_subject(self, subject):
        """Teste serialização de disciplina."""
        serializer = SubjectSerializer(subject)
        assert serializer.data['name'] == subject.name
        assert 'code' in serializer.data

    def test_deserialize_subject(self, school):
        """Teste desserialização de disciplina."""
        data = {
            'name': 'Matemática',
            'code': 'MAT001',
            'school': school.pk
        }
        serializer = SubjectSerializer(data=data)
        assert serializer.is_valid()


@pytest.mark.django_db
class TestGradeSerializer:
    """Testes para GradeSerializer."""

    def test_serialize_grade(self, grade):
        """Teste serialização de nota."""
        serializer = GradeSerializer(grade)
        assert 'average' in serializer.data
        assert 'first_period' in serializer.data
        assert 'status' in serializer.data

    def test_grade_average_computed(self, grade):
        """Teste se média é calculada automaticamente."""
        serializer = GradeSerializer(grade)
        data = serializer.data
        # Verifica se average existe e é um valor numérico
        assert isinstance(data.get('average'), (int, float, str))

    def test_grade_status_determined(self, grade):
        """Teste se status é determinado automaticamente."""
        serializer = GradeSerializer(grade)
        status_value = serializer.data.get('status')
        assert status_value in ['approved', 'failed', 'pending']


@pytest.mark.django_db
class TestAttendanceSerializer:
    """Testes para AttendanceSerializer."""

    def test_serialize_attendance(self, attendance):
        """Teste serialização de frequência."""
        serializer = AttendanceSerializer(attendance)
        assert 'date' in serializer.data
        assert 'status' in serializer.data

    def test_deserialize_attendance(self, student, class_obj):
        """Teste desserialização de frequência."""
        from datetime import date
        data = {
            'student': student.pk,
            'class_obj': class_obj.pk,
            'date': str(date.today()),
            'status': 'present'
        }
        serializer = AttendanceSerializer(data=data)
        assert serializer.is_valid()

    def test_invalid_attendance_status(self, student, class_obj):
        """Teste status inválido de frequência."""
        from datetime import date
        data = {
            'student': student.pk,
            'class_obj': class_obj.pk,
            'date': str(date.today()),
            'status': 'invalid_status'
        }
        serializer = AttendanceSerializer(data=data)
        assert not serializer.is_valid()


@pytest.mark.django_db
class TestClassSerializer:
    """Testes para ClassSerializer."""

    def test_serialize_class(self, class_obj):
        """Teste serialização de turma."""
        serializer = ClassSerializer(class_obj)
        assert 'name' in serializer.data
        assert 'grade_level' in serializer.data

    def test_class_includes_teacher(self, class_obj):
        """Teste se turma contém professor."""
        serializer = ClassSerializer(class_obj)
        assert 'teacher' in serializer.data or 'teacher_name' in serializer.data

    def test_class_includes_classroom(self, class_obj):
        """Teste se turma contém sala."""
        serializer = ClassSerializer(class_obj)
        assert 'classroom' in serializer.data or 'classroom_name' in serializer.data

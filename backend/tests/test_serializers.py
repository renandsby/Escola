"""Testes dos serializers principais do domínio SME."""

from datetime import date
from decimal import Decimal

import pytest

from apps.class_diary.api.serializers import AttendanceSerializer, GradeSerializer
from apps.classes.api.serializers import SchoolClassSerializer
from apps.curriculum.api.serializers import SubjectSerializer
from apps.governance.api.serializers import EducationDepartmentSerializer
from apps.schools.api.serializers import SchoolSerializer
from apps.students.api.serializers import StudentSerializer


@pytest.mark.django_db
class TestEducationDepartmentSerializer:
    def test_serialize(self, department):
        data = EducationDepartmentSerializer(department).data
        assert data['municipality_name'] == department.municipality_name
        assert data['ibge_code'] == department.ibge_code
        assert 'id' in data


@pytest.mark.django_db
class TestSchoolSerializer:
    def test_serialize(self, school):
        data = SchoolSerializer(school).data
        assert data['name'] == school.name
        assert data['school_type'] == school.school_type
        assert data['education_department'] == school.education_department_id
        assert 'inep_code' in data

    def test_deserialize_valid(self, department):
        payload = {
            'education_department': str(department.pk),
            'name': 'Nova Escola',
            'school_type': 'CRECHE',
            'inep_code': '35999999',
            'email': 'nova@escola.gov.br',
        }
        serializer = SchoolSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors

    def test_invalid_empty_name(self, department):
        payload = {
            'education_department': str(department.pk),
            'name': '',
            'school_type': 'CRECHE',
        }
        serializer = SchoolSerializer(data=payload)
        assert not serializer.is_valid()


@pytest.mark.django_db
class TestStudentSerializer:
    def test_serialize(self, student):
        data = StudentSerializer(student).data
        assert data['unique_municipal_id'] == student.unique_municipal_id
        assert data['full_name'] == student.full_name
        assert data['mother_name'] == student.mother_name
        assert data['registration_number'] == student.unique_municipal_id

    def test_deserialize_valid(self, department):
        payload = {
            'education_department': str(department.pk),
            'unique_municipal_id': 'MUN99990001',
            'full_name': 'João da Silva',
            'mother_name': 'Maria da Silva',
            'birth_date': '2014-05-20',
            'gender': 'M',
        }
        serializer = StudentSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
class TestSubjectSerializer:
    def test_serialize(self, subject):
        data = SubjectSerializer(subject).data
        assert data['name'] == subject.name
        assert data['bncc_code'] == subject.bncc_code
        assert data['area_of_knowledge'] == subject.area_of_knowledge

    def test_deserialize_valid(self, department):
        payload = {
            'education_department': str(department.pk),
            'name': 'Ciências',
            'bncc_code': 'CNT.CIE',
            'area_of_knowledge': 'Ciências da Natureza',
        }
        serializer = SubjectSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
class TestGradeSerializer:
    def test_serialize(self, grade):
        data = GradeSerializer(grade).data
        assert data['score'] is not None
        assert 'effective_score' in data
        assert data['enrollment'] == grade.enrollment_id
        assert data['subject'] == grade.subject_id

    def test_effective_score_field(self, grade):
        grade.score = Decimal('6.00')
        grade.final_score = Decimal('7.50')
        grade.save()
        data = GradeSerializer(grade).data
        assert Decimal(str(data['effective_score'])) == Decimal('7.50')


@pytest.mark.django_db
class TestAttendanceSerializer:
    def test_serialize_nullable_subject(self, attendance):
        data = AttendanceSerializer(attendance).data
        assert data['status'] == 'PRESENT'
        assert data['subject'] is None
        assert 'date' in data

    def test_deserialize_valid(self, enrollment, school_class):
        payload = {
            'enrollment': str(enrollment.pk),
            'school_class': str(school_class.pk),
            'subject': None,
            'date': str(date.today()),
            'status': 'ABSENT',
        }
        serializer = AttendanceSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors

    def test_invalid_status(self, enrollment, school_class):
        payload = {
            'enrollment': str(enrollment.pk),
            'school_class': str(school_class.pk),
            'date': str(date.today()),
            'status': 'invalid_status',
        }
        serializer = AttendanceSerializer(data=payload)
        # CharField sem ChoiceField — validação de choices depende do serializer;
        # aceita se inválido no model ou se serializer rejeitar.
        if serializer.is_valid():
            with pytest.raises(Exception):
                serializer.save()


@pytest.mark.django_db
class TestSchoolClassSerializer:
    def test_serialize(self, school_class):
        data = SchoolClassSerializer(school_class).data
        assert data['name'] == school_class.name
        assert data['shift'] == school_class.shift
        assert 'student_count' in data
        assert data['school'] == school_class.school_id

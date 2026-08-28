"""Testes de modelos do domínio SME (~15 casos focados)."""

from datetime import date
from decimal import Decimal

import pytest
from django.db import IntegrityError

from apps.class_diary.models import Attendance, AttendanceStatus, Grade
from apps.schools.models import School
from apps.students.models import Student
from apps.classes.models import TeacherAllocation
from core.models import UserRole
from tests.factories import (
    AcademicPeriodFactory,
    AttendanceFactory,
    EducationDepartmentFactory,
    EnrollmentFactory,
    GradeFactory,
    SchoolClassFactory,
    SchoolFactory,
    StudentFactory,
    SubjectFactory,
    TeacherAllocationFactory,
    TeacherProfileFactory,
)


@pytest.mark.django_db
class TestEducationDepartment:
    def test_ibge_code_unique(self, department):
        with pytest.raises(IntegrityError):
            EducationDepartmentFactory(ibge_code=department.ibge_code)

    def test_str_contains_municipality(self, department):
        assert department.municipality_name in str(department)


@pytest.mark.django_db
class TestSchoolSoftDelete:
    def test_soft_delete_sets_deleted_at(self, school):
        school.delete()
        school.refresh_from_db()
        assert school.deleted_at is not None
        assert school.is_active is False

    def test_soft_delete_keeps_row(self, school):
        pk = school.pk
        school.delete()
        assert School.objects.filter(pk=pk).exists()

    def test_restore_clears_deleted_at(self, school):
        school.soft_delete()
        school.restore()
        school.refresh_from_db()
        assert school.deleted_at is None
        assert school.is_active is True


@pytest.mark.django_db
class TestStudentMunicipalId:
    def test_unique_municipal_id_constraint(self, student):
        with pytest.raises(IntegrityError):
            StudentFactory(
                education_department=student.education_department,
                unique_municipal_id=student.unique_municipal_id,
            )

    def test_registration_number_alias(self, student):
        assert student.registration_number == student.unique_municipal_id

    def test_user_nullable(self, department):
        student = StudentFactory(education_department=department, user=None)
        assert student.user is None
        assert student.full_name
        assert student.mother_name


@pytest.mark.django_db
class TestTeacherAllocation:
    def test_multi_school_allocation(self, teacher_profile, school_class, school_class_b, subject):
        alloc_a = TeacherAllocationFactory(
            teacher_profile=teacher_profile,
            school_class=school_class,
            subject=subject,
        )
        subject_b = SubjectFactory(
            education_department=teacher_profile.education_department,
            name='Português',
        )
        alloc_b = TeacherAllocationFactory(
            teacher_profile=teacher_profile,
            school_class=school_class_b,
            subject=subject_b,
        )
        schools = {
            a.school_class.school_id
            for a in TeacherAllocation.objects.filter(teacher_profile=teacher_profile)
        }
        assert alloc_a.school_class.school_id != alloc_b.school_class.school_id
        assert len(schools) == 2

    def test_regent_allocation_without_subject(self, teacher_profile, school_class):
        alloc = TeacherAllocationFactory(
            teacher_profile=teacher_profile,
            school_class=school_class,
            subject=None,
            is_regent=True,
        )
        assert alloc.subject is None
        assert alloc.is_regent is True


@pytest.mark.django_db
class TestGradeConstraints:
    def test_unique_enrollment_subject_period(
        self, enrollment, subject, academic_period, teacher_user
    ):
        GradeFactory(
            enrollment=enrollment,
            subject=subject,
            academic_period=academic_period,
            teacher=teacher_user,
            score=Decimal('8.0'),
        )
        with pytest.raises(IntegrityError):
            GradeFactory(
                enrollment=enrollment,
                subject=subject,
                academic_period=academic_period,
                teacher=teacher_user,
                score=Decimal('9.0'),
            )

    def test_effective_score(self, grade):
        grade.score = Decimal('7.00')
        grade.recovery_score = Decimal('8.50')
        grade.final_score = None
        assert grade.get_effective_score() == Decimal('8.50')


@pytest.mark.django_db
class TestAttendanceNullableSubject:
    def test_create_without_subject(self, enrollment, school_class):
        att = AttendanceFactory(
            enrollment=enrollment,
            school_class=school_class,
            subject=None,
            status=AttendanceStatus.PRESENT,
            date=date.today(),
        )
        assert att.subject_id is None
        assert att.status == AttendanceStatus.PRESENT

    def test_excused_absence_status(self, enrollment, school_class):
        att = Attendance.objects.create(
            enrollment=enrollment,
            school_class=school_class,
            subject=None,
            date=date.today(),
            status=AttendanceStatus.EXCUSED_ABSENCE,
            justification_note='Atestado médico',
        )
        assert att.status == AttendanceStatus.EXCUSED_ABSENCE


@pytest.mark.django_db
class TestEnrollmentAndUserRoles:
    def test_enrollment_status_enrolled(self, enrollment):
        assert enrollment.status == 'ENROLLED'
        assert enrollment.school_class is not None

    def test_user_roles_values(self):
        expected = {
            'sme_admin',
            'sme_supervisor',
            'school_director',
            'school_secretary',
            'teacher',
            'student_guardian',
        }
        assert set(UserRole.values) == expected

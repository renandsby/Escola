"""Testes dos services de upsert em lote (bulk_create/bulk_update)."""

from datetime import date, timedelta
from decimal import Decimal

import pytest

from apps.class_diary.models import Attendance, Grade
from apps.class_diary.services.attendance_batch_service import batch_upsert_attendance
from apps.class_diary.services.grade_batch_service import batch_upsert_grades
from apps.class_diary.tests.factories import (
    AcademicPeriodFactory,
    EnrollmentFactory,
    GradeFactory,
    AttendanceFactory,
    SchoolClassFactory,
    StudentFactory,
    SubjectFactory,
    TeacherUserFactory,
)


@pytest.mark.django_db
class TestGradeBatchService:
    def test_should_create_new_grades_in_bulk(self, django_assert_max_num_queries):
        teacher = TeacherUserFactory()
        school_class = SchoolClassFactory(school__education_department=teacher.education_department)
        academic_year_period = AcademicPeriodFactory(academic_year=school_class.academic_year)
        subject = SubjectFactory(education_department=teacher.education_department)
        items = []
        for _ in range(40):
            student = StudentFactory(education_department=teacher.education_department)
            enrollment = EnrollmentFactory(student=student, school_class=school_class)
            items.append(
                {
                    'enrollment': enrollment.id,
                    'subject': subject.id,
                    'academic_period': academic_year_period.id,
                    'teacher': teacher.id,
                    'score': Decimal('7.50'),
                }
            )

        with django_assert_max_num_queries(6):
            results = batch_upsert_grades(items=items, actor_user=teacher)

        assert len(results) == 40
        assert all(r['created'] for r in results)
        assert Grade.objects.count() == 40

    def test_should_update_existing_grades_in_bulk(self):
        teacher = TeacherUserFactory()
        grades = [GradeFactory(score=Decimal('5.00')) for _ in range(5)]

        items = [
            {
                'enrollment': g.enrollment_id,
                'subject': g.subject_id,
                'academic_period': g.academic_period_id,
                'teacher': teacher.id,
                'score': Decimal('9.00'),
            }
            for g in grades
        ]

        results = batch_upsert_grades(items=items, actor_user=teacher)

        assert len(results) == 5
        assert all(not r['created'] for r in results)
        assert Grade.objects.count() == 5
        for g in grades:
            g.refresh_from_db()
            assert g.score == Decimal('9.00')

    def test_batch_upsert_is_idempotent(self):
        teacher = TeacherUserFactory()
        subject = SubjectFactory(education_department=teacher.education_department)
        period = AcademicPeriodFactory()
        enrollment = EnrollmentFactory(student__education_department=teacher.education_department)
        items = [
            {
                'enrollment': enrollment.id,
                'subject': subject.id,
                'academic_period': period.id,
                'teacher': teacher.id,
                'score': Decimal('6.00'),
            }
        ]

        first = batch_upsert_grades(items=items, actor_user=teacher)
        assert Grade.objects.count() == 1
        assert first[0]['created'] is True

        second = batch_upsert_grades(items=items, actor_user=teacher)
        assert Grade.objects.count() == 1
        assert second[0]['created'] is False
        assert second[0]['id'] == first[0]['id']

    def test_mixed_batch_creates_and_updates_correctly(self):
        teacher = TeacherUserFactory()
        existing_grade = GradeFactory(score=Decimal('4.00'))
        subject = SubjectFactory(education_department=teacher.education_department)
        period = AcademicPeriodFactory()
        new_enrollment = EnrollmentFactory(student__education_department=teacher.education_department)

        items = [
            {
                'enrollment': existing_grade.enrollment_id,
                'subject': existing_grade.subject_id,
                'academic_period': existing_grade.academic_period_id,
                'teacher': teacher.id,
                'score': Decimal('10.00'),
            },
            {
                'enrollment': new_enrollment.id,
                'subject': subject.id,
                'academic_period': period.id,
                'teacher': teacher.id,
                'score': Decimal('6.50'),
            },
        ]

        results = batch_upsert_grades(items=items, actor_user=teacher)

        created_flags = {r['created'] for r in results}
        assert created_flags == {True, False}
        assert Grade.objects.count() == 2
        existing_grade.refresh_from_db()
        assert existing_grade.score == Decimal('10.00')


@pytest.mark.django_db
class TestAttendanceBatchService:
    def test_should_create_new_attendance_in_bulk(self, django_assert_max_num_queries):
        items = []
        today = date.today()
        for i in range(40):
            enrollment = EnrollmentFactory()
            items.append(
                {
                    'enrollment': enrollment.id,
                    'school_class': enrollment.school_class_id,
                    'subject': None,
                    'date': today - timedelta(days=i % 5),
                    'status': 'PRESENT',
                }
            )

        with django_assert_max_num_queries(6):
            results = batch_upsert_attendance(items=items)

        assert len(results) == 40
        assert all(r['created'] for r in results)
        assert Attendance.objects.count() == 40

    def test_should_update_existing_attendance_in_bulk(self):
        records = [AttendanceFactory(status='PRESENT') for _ in range(5)]

        items = [
            {
                'enrollment': a.enrollment_id,
                'school_class': a.school_class_id,
                'subject': a.subject_id,
                'date': a.date,
                'status': 'ABSENT',
                'justification_note': 'Atualizado em lote',
            }
            for a in records
        ]

        results = batch_upsert_attendance(items=items)

        assert len(results) == 5
        assert all(not r['created'] for r in results)
        assert Attendance.objects.count() == 5
        for a in records:
            a.refresh_from_db()
            assert a.status == 'ABSENT'
            assert a.justification_note == 'Atualizado em lote'

    def test_batch_upsert_is_idempotent(self):
        enrollment = EnrollmentFactory()
        items = [
            {
                'enrollment': enrollment.id,
                'school_class': enrollment.school_class_id,
                'subject': None,
                'date': date.today(),
                'status': 'PRESENT',
            }
        ]

        first = batch_upsert_attendance(items=items)
        assert Attendance.objects.count() == 1
        assert first[0]['created'] is True

        second = batch_upsert_attendance(items=items)
        assert Attendance.objects.count() == 1
        assert second[0]['created'] is False
        assert second[0]['id'] == first[0]['id']

    def test_mixed_batch_creates_and_updates_correctly(self):
        existing = AttendanceFactory(status='PRESENT')
        new_enrollment = EnrollmentFactory()

        items = [
            {
                'enrollment': existing.enrollment_id,
                'school_class': existing.school_class_id,
                'subject': existing.subject_id,
                'date': existing.date,
                'status': 'ABSENT',
            },
            {
                'enrollment': new_enrollment.id,
                'school_class': new_enrollment.school_class_id,
                'subject': None,
                'date': date.today(),
                'status': 'PRESENT',
            },
        ]

        results = batch_upsert_attendance(items=items)

        created_flags = {r['created'] for r in results}
        assert created_flags == {True, False}
        assert Attendance.objects.count() == 2
        existing.refresh_from_db()
        assert existing.status == 'ABSENT'

    def test_nullable_subject_upsert_key_edge_case(self):
        """Registros com subject=None (frequência diária) e subject preenchido
        (frequência por disciplina) na mesma data/matrícula não devem colidir,
        e o upsert de um item com subject=None deve casar corretamente com um
        registro existente que também tem subject=None."""
        enrollment = EnrollmentFactory()
        today = date.today()
        subject = SubjectFactory(education_department=enrollment.student.education_department)

        null_subject_record = AttendanceFactory(
            enrollment=enrollment,
            school_class=enrollment.school_class,
            subject=None,
            date=today,
            status='PRESENT',
        )
        with_subject_record = AttendanceFactory(
            enrollment=enrollment,
            school_class=enrollment.school_class,
            subject=subject,
            date=today,
            status='PRESENT',
        )

        items = [
            {
                'enrollment': enrollment.id,
                'school_class': enrollment.school_class_id,
                'subject': None,
                'date': today,
                'status': 'ABSENT',
            },
            {
                'enrollment': enrollment.id,
                'school_class': enrollment.school_class_id,
                'subject': subject.id,
                'date': today,
                'status': 'EXCUSED_ABSENCE',
            },
        ]

        results = batch_upsert_attendance(items=items)

        assert all(not r['created'] for r in results)
        assert Attendance.objects.count() == 2

        null_subject_record.refresh_from_db()
        with_subject_record.refresh_from_db()
        assert null_subject_record.status == 'ABSENT'
        assert with_subject_record.status == 'EXCUSED_ABSENCE'

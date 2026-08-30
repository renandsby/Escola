"""P2-YEAREND — fechamento de ano letivo e trava do diário."""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.class_diary.models import SchoolHistory
from apps.class_diary.services.grade_batch_service import batch_upsert_grades
from apps.governance.models import AcademicYearStatus
from apps.governance.services.year_closing_service import close_academic_year
from apps.students.models import EnrollmentStatus
from apps.students.tests.factories import (
    AcademicYearFactory,
    EnrollmentFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SMEAdminFactory,
    StudentFactory,
)
from apps.class_diary.tests.factories import (
    AcademicPeriodFactory,
    AttendanceFactory,
    GradeFactory,
    SubjectFactory,
)
from core.exceptions import BusinessLogicError

pytestmark = pytest.mark.django_db


def _closed_calendar_year(dept):
    year = AcademicYearFactory(education_department=dept, status=AcademicYearStatus.ACTIVE)
    # bimestre já terminado
    AcademicPeriodFactory(
        academic_year=year,
        period_number=1,
        start_date=date.today() - timedelta(days=120),
        end_date=date.today() - timedelta(days=30),
    )
    return year


def test_low_grade_student_is_failed_academic_and_recorded():
    admin = SMEAdminFactory()
    dept = admin.education_department
    year = _closed_calendar_year(dept)
    klass = SchoolClassFactory(academic_year=year, school__education_department=dept)
    student = StudentFactory(education_department=dept)
    enrollment = EnrollmentFactory(student=student, school_class=klass)
    subject = SubjectFactory(education_department=dept)
    period = klass.academic_year.periods.first()
    GradeFactory(enrollment=enrollment, subject=subject, academic_period=period, score=Decimal('5.5'))
    for i in range(10):
        AttendanceFactory(enrollment=enrollment, school_class=klass, status='PRESENT')

    summary = close_academic_year(academic_year_id=year.id, actor_user=admin)

    enrollment.refresh_from_db()
    assert enrollment.status == EnrollmentStatus.FAILED_ACADEMIC
    assert summary['failed_academic'] == 1
    history = SchoolHistory.objects.get(student=student)
    assert history.final_status == 'failed'
    assert history.overall_average == 5.5


def test_year_status_becomes_closed():
    admin = SMEAdminFactory()
    year = _closed_calendar_year(admin.education_department)
    close_academic_year(academic_year_id=year.id, actor_user=admin)
    year.refresh_from_db()
    assert year.status == AcademicYearStatus.CLOSED


def test_grades_batch_rejected_after_close():
    admin = SMEAdminFactory()
    dept = admin.education_department
    year = _closed_calendar_year(dept)
    klass = SchoolClassFactory(academic_year=year, school__education_department=dept)
    enrollment = EnrollmentFactory(school_class=klass, student__education_department=dept)
    subject = SubjectFactory(education_department=dept)
    period = year.periods.first()

    close_academic_year(academic_year_id=year.id, actor_user=admin)

    with pytest.raises(BusinessLogicError) as exc:
        batch_upsert_grades(
            items=[{
                'enrollment': str(enrollment.id),
                'subject': str(subject.id),
                'academic_period': str(period.id),
                'score': Decimal('9.0'),
            }],
            actor_user=admin,
        )
    assert exc.value.code == 'YEAR_ALREADY_CLOSED'


def test_only_sme_admin_can_close_via_api():
    director = SchoolDirectorFactory()
    year = _closed_calendar_year(director.education_department or SMEAdminFactory().education_department)
    client = APIClient()
    client.force_authenticate(director)
    resp = client.post(f'/api/v1/sme/academic-years/{year.id}/close/')
    assert resp.status_code == 403


def test_close_blocked_while_period_open():
    admin = SMEAdminFactory()
    year = AcademicYearFactory(
        education_department=admin.education_department, status=AcademicYearStatus.ACTIVE
    )
    AcademicPeriodFactory(
        academic_year=year,
        period_number=1,
        start_date=date.today() - timedelta(days=30),
        end_date=date.today() + timedelta(days=30),
    )
    with pytest.raises(BusinessLogicError) as exc:
        close_academic_year(academic_year_id=year.id, actor_user=admin)
    assert exc.value.code == 'YEAR_HAS_OPEN_PERIODS'

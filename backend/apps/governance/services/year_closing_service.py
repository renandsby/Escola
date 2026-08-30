"""Fechamento de ano letivo e consolidação de histórico (P2-YEAREND)."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError
from apps.audit.services.audit_service import log_action
from apps.class_diary.services.history_consolidation_service import (
    compute_enrollment_result,
    consolidate_history,
)
from apps.governance.models import AcademicYear, AcademicYearStatus
from apps.students.models import Enrollment, EnrollmentStatus


@transaction.atomic
def close_academic_year(*, academic_year_id, actor_user) -> dict:
    year = (
        AcademicYear.objects.select_for_update()
        .select_related('education_department')
        .filter(id=academic_year_id)
        .first()
    )
    if year is None:
        raise BusinessLogicError(
            code='ACADEMIC_YEAR_NOT_FOUND',
            message='Ano letivo não encontrado.',
            status_code=404,
        )
    if year.status == AcademicYearStatus.CLOSED:
        raise BusinessLogicError(
            code='YEAR_ALREADY_CLOSED',
            message='Este ano letivo já está encerrado.',
        )

    today = timezone.localdate()
    open_periods = list(year.periods.filter(end_date__gte=today).values_list('name', flat=True))
    if open_periods:
        raise BusinessLogicError(
            code='YEAR_HAS_OPEN_PERIODS',
            message='Encerre todos os bimestres antes de fechar o ano: '
            + ', '.join(open_periods),
        )

    dept = year.education_department
    min_grade = dept.min_passing_grade
    min_attendance = dept.min_attendance_percentage

    tally = {
        EnrollmentStatus.APPROVED: 0,
        EnrollmentStatus.FAILED_ACADEMIC: 0,
        EnrollmentStatus.FAILED_ATTENDANCE: 0,
    }

    enrollments = (
        Enrollment.objects.select_for_update()
        .filter(
            school_class__academic_year_id=year.id,
            status=EnrollmentStatus.ENROLLED,
            deleted_at__isnull=True,
        )
        .select_related('student', 'school_class')
    )
    for enrollment in enrollments:
        result = compute_enrollment_result(
            enrollment=enrollment, min_grade=min_grade, min_attendance=min_attendance
        )
        enrollment.status = result['status']
        enrollment.save(update_fields=['status', 'updated_at'])
        consolidate_history(enrollment=enrollment, result=result)
        tally[result['status']] += 1

    year.status = AcademicYearStatus.CLOSED
    year.save(update_fields=['status', 'updated_at'])

    summary = {
        'academic_year_id': str(year.id),
        'year': year.year,
        'approved': tally[EnrollmentStatus.APPROVED],
        'failed_academic': tally[EnrollmentStatus.FAILED_ACADEMIC],
        'failed_attendance': tally[EnrollmentStatus.FAILED_ATTENDANCE],
        'total': sum(tally.values()),
    }
    log_action(
        user=actor_user,
        action='ACADEMIC_YEAR_CLOSED',
        resource='academic-years',
        resource_id=str(year.id),
        details=summary,
    )
    return summary

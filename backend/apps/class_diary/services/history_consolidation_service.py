"""Consolidação do histórico escolar no fechamento do ano (P2-YEAREND)."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Avg, Count, Q

from apps.class_diary.models import Attendance, Grade, SchoolHistory
from apps.students.models import EnrollmentStatus


def _grade_value(grade) -> Decimal | None:
    for candidate in (grade.final_score, grade.recovery_score, grade.score):
        if candidate is not None:
            return Decimal(candidate)
    return None


def compute_enrollment_result(*, enrollment, min_grade: Decimal, min_attendance: Decimal) -> dict:
    """Média final por disciplina, frequência global e status resultante."""
    grades = list(
        Grade.objects.filter(enrollment=enrollment).select_related('subject')
    )
    by_subject: dict = {}
    for grade in grades:
        value = _grade_value(grade)
        if value is not None:
            by_subject.setdefault(grade.subject_id, []).append(value)

    subject_means = [sum(v) / len(v) for v in by_subject.values() if v]
    overall_average = (
        float(sum(subject_means) / len(subject_means)) if subject_means else None
    )

    att = Attendance.objects.filter(enrollment=enrollment).aggregate(
        total=Count('id'), present=Count('id', filter=Q(status='PRESENT'))
    )
    total = att['total'] or 0
    absences = total - (att['present'] or 0)
    attendance_pct = (att['present'] / total * 100) if total else 100.0

    if attendance_pct < float(min_attendance):
        status = EnrollmentStatus.FAILED_ATTENDANCE
    elif overall_average is not None and overall_average < float(min_grade):
        status = EnrollmentStatus.FAILED_ACADEMIC
    else:
        status = EnrollmentStatus.APPROVED

    return {
        'overall_average': round(overall_average, 2) if overall_average is not None else None,
        'total_classes': total,
        'absences': absences,
        'attendance_percentage': round(attendance_pct, 2),
        'status': status,
    }


def consolidate_history(*, enrollment, result: dict) -> SchoolHistory:
    final_map = {
        EnrollmentStatus.APPROVED: 'approved',
        EnrollmentStatus.FAILED_ACADEMIC: 'failed',
        EnrollmentStatus.FAILED_ATTENDANCE: 'failed',
    }
    history, _ = SchoolHistory.objects.update_or_create(
        student=enrollment.student,
        defaults={
            'total_classes': result['total_classes'],
            'absences': result['absences'],
            'attendance_percentage': result['attendance_percentage'],
            'overall_average': result['overall_average'],
            'final_status': final_map.get(result['status'], 'pending'),
        },
    )
    return history

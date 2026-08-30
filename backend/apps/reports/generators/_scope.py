"""Querysets estritamente filtrados pelo escopo da execução.

O escopo já foi resolvido e autorizado no serviço (`services/executions.py`),
mas o §3.6 do plano exige reforçá-lo **na query do gerador** — nunca confiar só
no serializer de entrada.
"""

from __future__ import annotations

from apps.class_diary.models import Attendance, DescriptiveEvaluation, Grade
from apps.classes.models import SchoolClass, TeacherAllocation
from apps.students.models import Enrollment, EnrollmentStatus, TransferRequest

from .base import ReportScope


def _apply(qs, scope: ReportScope, *, dept_field, school_field, class_field):
    if scope.class_group_id:
        return qs.filter(**{class_field: scope.class_group_id})
    if scope.school_id:
        return qs.filter(**{school_field: scope.school_id})
    if scope.education_department_id:
        return qs.filter(**{dept_field: scope.education_department_id})
    return qs.none()


def scoped_classes(scope: ReportScope, academic_year=None):
    qs = SchoolClass.objects.filter(deleted_at__isnull=True).select_related(
        'school', 'curriculum_matrix__education_stage'
    )
    qs = _apply(
        qs, scope,
        dept_field='school__education_department_id',
        school_field='school_id',
        class_field='id',
    )
    if academic_year is not None:
        qs = qs.filter(academic_year=academic_year)
    return qs


def scoped_enrollments(scope: ReportScope, academic_year=None, *, status=EnrollmentStatus.ENROLLED):
    qs = Enrollment.objects.filter(deleted_at__isnull=True).select_related(
        'student', 'school_class__school', 'school_class__curriculum_matrix__education_stage'
    )
    qs = _apply(
        qs, scope,
        dept_field='school_class__school__education_department_id',
        school_field='school_class__school_id',
        class_field='school_class_id',
    )
    if status:
        qs = qs.filter(status=status)
    if academic_year is not None:
        qs = qs.filter(school_class__academic_year=academic_year)
    return qs


def scoped_transfers(scope: ReportScope, academic_year=None):
    qs = TransferRequest.objects.filter(deleted_at__isnull=True).select_related(
        'student', 'origin_school', 'destination_school'
    )
    if scope.school_id:
        from django.db.models import Q

        qs = qs.filter(Q(origin_school_id=scope.school_id) | Q(destination_school_id=scope.school_id))
    elif scope.education_department_id:
        qs = qs.filter(student__education_department_id=scope.education_department_id)
    else:
        qs = qs.none()
    if academic_year is not None:
        qs = qs.filter(academic_year=academic_year)
    return qs


def scoped_allocations(scope: ReportScope, academic_year=None):
    qs = TeacherAllocation.objects.select_related(
        'teacher_profile__user', 'school_class__school', 'subject'
    )
    qs = _apply(
        qs, scope,
        dept_field='school_class__school__education_department_id',
        school_field='school_class__school_id',
        class_field='school_class_id',
    )
    if academic_year is not None:
        qs = qs.filter(school_class__academic_year=academic_year)
    return qs


def grades_for(enrollments, period=None):
    qs = Grade.objects.filter(enrollment__in=enrollments).select_related('subject', 'academic_period')
    if period is not None:
        qs = qs.filter(academic_period=period)
    return qs


def attendance_for(enrollments):
    return Attendance.objects.filter(enrollment__in=enrollments)


def descriptive_for(enrollments, period=None):
    qs = DescriptiveEvaluation.objects.filter(enrollment__in=enrollments).select_related(
        'academic_period', 'teacher'
    )
    if period is not None:
        qs = qs.filter(academic_period=period)
    return qs


def attendance_rate_by_enrollment(enrollments) -> dict:
    """{enrollment_id: freq_% acumulada no ano}."""
    from django.db.models import Count, Q

    out = {}
    for r in (
        attendance_for(enrollments)
        .values('enrollment_id')
        .annotate(total=Count('id'), present=Count('id', filter=Q(status='PRESENT')))
    ):
        if r['total']:
            out[r['enrollment_id']] = round(r['present'] / r['total'] * 100, 1)
    return out

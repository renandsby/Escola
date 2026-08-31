"""Querysets com escopo RBAC para o domínio de admissões."""

from __future__ import annotations

from core.models import UserRole
from core.scopes import apply_scope
from apps.admissions.models import (
    AdmissionCycle,
    EnrollmentRequest,
    PriorityEvidence,
    RenewalRequest,
)

_STAFF = {
    UserRole.SME_ADMIN,
    UserRole.SME_SUPERVISOR,
    UserRole.SCHOOL_DIRECTOR,
    UserRole.SCHOOL_SECRETARY,
}


def get_cycles_for_user(*, user):
    qs = AdmissionCycle.objects.select_related('target_academic_year', 'education_department')
    if not getattr(user, 'is_authenticated', False):
        return qs.none()
    dept_id = getattr(user, 'education_department_id', None)
    if dept_id:
        return qs.filter(education_department_id=dept_id)
    # equipe de escola sem dept explícito → pelo vínculo da escola
    school_id = getattr(user, 'school_id', None)
    if school_id:
        return qs.filter(education_department__schools__id=school_id).distinct()
    return qs.none()


def _guardian_id(user):
    guardian = getattr(user, 'guardian_profile', None)
    return guardian.id if guardian is not None else None


def get_renewals_for_user(*, user, **filters):
    qs = RenewalRequest.objects.select_related(
        'cycle', 'cycle__target_academic_year', 'student', 'current_enrollment__school_class__school'
    )
    role = getattr(user, 'role', None)
    if role == UserRole.STUDENT_GUARDIAN:
        qs = apply_scope(qs, user, student_field='student_id')
    else:
        qs = apply_scope(
            qs,
            user,
            department_field='cycle__education_department_id',
            school_field='current_enrollment__school_class__school_id',
        )
    if filters:
        qs = qs.filter(**filters)
    return qs.distinct()


def get_enrollment_requests_for_user(*, user, **filters):
    qs = EnrollmentRequest.objects.select_related(
        'cycle', 'cycle__target_academic_year', 'guardian', 'student'
    ).prefetch_related('preferences__school', 'evidences')
    role = getattr(user, 'role', None)
    if role == UserRole.STUDENT_GUARDIAN:
        gid = _guardian_id(user)
        qs = qs.filter(guardian_id=gid) if gid else qs.none()
    elif role in _STAFF:
        qs = apply_scope(
            qs,
            user,
            department_field='cycle__education_department_id',
            school_field='preferences__school_id',
        )
    else:
        qs = qs.none()
    if filters:
        qs = qs.filter(**filters)
    return qs.distinct()


def get_evidence_queue_for_user(*, user, **filters):
    qs = PriorityEvidence.objects.select_related(
        'request', 'request__guardian', 'request__student', 'declared_school', 'verified_by'
    )
    role = getattr(user, 'role', None)
    if role not in _STAFF:
        return qs.none()
    qs = apply_scope(
        qs,
        user,
        department_field='request__cycle__education_department_id',
        school_field='request__preferences__school_id',
    )
    if filters:
        qs = qs.filter(**filters)
    return qs.distinct()

from django.db.models import Q

from core.scopes import apply_scope
from apps.students.models import Enrollment, TransferRequest


def _scope_transfer_school(qs, user):
    school_id = getattr(user, 'school_id', None)
    if school_id is None:
        return qs.none()
    return qs.filter(Q(origin_school_id=school_id) | Q(destination_school_id=school_id))


def get_enrollments_for_user(*, user, status=None, school_class_id=None):
    """Matrículas visíveis para o usuário, conforme escopo RBAC."""
    qs = Enrollment.objects.filter(deleted_at__isnull=True).select_related(
        'student',
        'school_class',
        'school_class__school',
    )
    qs = apply_scope(
        qs,
        user,
        department_field='school_class__school__education_department_id',
        school_field='school_class__school_id',
        teacher_class_field='school_class_id',
        student_field='student_id',
    )
    if status:
        qs = qs.filter(status=status)
    if school_class_id:
        qs = qs.filter(school_class_id=school_class_id)
    return qs


def get_transfer_requests_for_user(*, user, status=None):
    """Solicitações de transferência visíveis para o usuário, conforme escopo RBAC."""
    qs = TransferRequest.objects.filter(deleted_at__isnull=True).select_related(
        'student',
        'origin_school',
        'destination_school',
        'academic_year',
    )
    qs = apply_scope(
        qs,
        user,
        department_field='student__education_department_id',
        school_field=_scope_transfer_school,
        student_field='student_id',
    )
    if status:
        qs = qs.filter(status=status)
    return qs.distinct()

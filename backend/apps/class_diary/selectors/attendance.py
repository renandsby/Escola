from core.scopes import apply_scope
from apps.class_diary.models import Attendance


def get_attendance_for_user(*, user, student_id=None, enrollment_id=None):
    """Frequências visíveis para o usuário, conforme escopo RBAC."""
    qs = Attendance.objects.filter(is_active=True).select_related(
        'enrollment',
        'enrollment__student',
        'school_class',
        'subject',
    )
    qs = apply_scope(
        qs,
        user,
        department_field='enrollment__school_class__school__education_department_id',
        school_field='enrollment__school_class__school_id',
        teacher_class_field='enrollment__school_class_id',
        student_field='enrollment__student_id',
    )
    if student_id:
        qs = qs.filter(enrollment__student_id=student_id)
    if enrollment_id:
        qs = qs.filter(enrollment_id=enrollment_id)
    return qs.distinct()

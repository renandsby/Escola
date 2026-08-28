from core.scopes import apply_scope
from apps.students.models import Guardian, StudentGuardian


def get_guardians_for_user(*, user, **filters):
    """Responsáveis visíveis para o usuário, conforme escopo RBAC."""
    qs = Guardian.objects.filter(deleted_at__isnull=True).select_related('user')
    qs = apply_scope(
        qs,
        user,
        department_field='student_links__student__education_department_id',
        school_field='student_links__student__enrollments__school_class__school_id',
        teacher_class_field='student_links__student__enrollments__school_class_id',
        student_field='student_links__student_id',
    )
    if filters:
        qs = qs.filter(**filters)
    return qs.distinct()


def get_student_guardian_links_for_user(*, user, **filters):
    """Vínculos aluno-responsável visíveis para o usuário, conforme escopo RBAC."""
    qs = StudentGuardian.objects.select_related('student', 'guardian')
    qs = apply_scope(
        qs,
        user,
        department_field='student__education_department_id',
        school_field='student__enrollments__school_class__school_id',
        teacher_class_field='student__enrollments__school_class_id',
        student_field='student_id',
    )
    if filters:
        qs = qs.filter(**filters)
    return qs.distinct()

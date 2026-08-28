from core.scopes import apply_scope
from apps.students.models import Student


def get_students_for_user(*, user, **filters):
    """Alunos visíveis para o usuário, conforme escopo RBAC."""
    qs = Student.objects.filter(deleted_at__isnull=True).select_related(
        'user',
        'education_department',
    )
    qs = apply_scope(
        qs,
        user,
        department_field='education_department_id',
        school_field='enrollments__school_class__school_id',
        teacher_class_field='enrollments__school_class_id',
        student_field='id',
    )
    if filters:
        qs = qs.filter(**filters)
    return qs.distinct()

from core.scopes import apply_scope

from apps.classes.models import SchoolClass


def get_school_classes_for_user(*, user):
    """Turmas visíveis para o usuário, conforme escopo RBAC."""
    qs = SchoolClass.objects.filter(deleted_at__isnull=True).select_related(
        'school',
        'academic_year',
        'curriculum_matrix',
        'classroom',
    )
    qs = apply_scope(
        qs,
        user,
        department_field='school__education_department_id',
        school_field='school_id',
        teacher_class_field='id',
        student_field='enrollments__student_id',
    )
    return qs.distinct()

from core.scopes import apply_scope
from apps.class_diary.models import DiaryEntry


def get_diary_entries_for_user(*, user):
    """Entradas de diário de classe visíveis para o usuário, conforme escopo RBAC."""
    qs = DiaryEntry.objects.filter(is_active=True).select_related(
        'school_class',
        'subject',
        'teacher',
        'teacher__user',
    )
    qs = apply_scope(
        qs,
        user,
        department_field='school_class__school__education_department_id',
        school_field='school_class__school_id',
        teacher_class_field='school_class_id',
        student_field='school_class__enrollments__student_id',
    )
    return qs.distinct()

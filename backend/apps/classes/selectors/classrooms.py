from core.scopes import apply_scope
from apps.classes.models import Classroom


def get_active_classrooms():
    """Salas de aula ativas — sem escopo (uso interno / compatibilidade)."""
    return Classroom.objects.filter(is_active=True).select_related('school')


def get_classrooms_for_user(*, user):
    """Salas visíveis conforme o papel: SME vê a rede; direção/secretaria só a
    própria escola; professor vê as salas das escolas onde tem turma."""
    qs = Classroom.objects.filter(is_active=True).select_related('school')
    qs = apply_scope(
        qs,
        user,
        department_field='school__education_department_id',
        school_field='school_id',
        teacher_class_field='school__school_classes__id',
        student_field='school__school_classes__enrollments__student_id',
    )
    return qs.distinct()

from apps.classes.models import Classroom


def get_active_classrooms():
    """Salas de aula ativas (dado operacional, sem escopo RBAC dedicado)."""
    return Classroom.objects.filter(is_active=True).select_related('school')

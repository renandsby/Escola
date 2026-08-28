from core.scopes import apply_scope

from apps.schools.models import School


def get_schools_for_user(*, user):
    """Escolas visíveis conforme o escopo RBAC do usuário."""
    qs = School.objects.filter(deleted_at__isnull=True).select_related(
        'education_department',
        'director_user',
    )
    return apply_scope(
        qs,
        user,
        department_field='education_department_id',
        school_field='id',
    )

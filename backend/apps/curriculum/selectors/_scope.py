"""Helpers de escopo do domínio de currículo.

Diretor/secretário não têm ``education_department_id`` diretamente no usuário — o
departamento é resolvido a partir da escola vinculada. Estas funções encapsulam
essa resolução para uso como ``school_field`` callable em ``apply_scope``.
"""

from apps.schools.models import School


def department_id_for_user(user):
    dept_id = getattr(user, 'education_department_id', None)
    if dept_id is None and getattr(user, 'school_id', None):
        dept_id = (
            School.objects.filter(pk=user.school_id)
            .values_list('education_department_id', flat=True)
            .first()
        )
    return dept_id


def scope_by_department_path(path):
    """Devolve um callable(qs, user) que filtra ``<path>=<dept do usuário>``."""

    def _scoped(qs, user):
        dept_id = department_id_for_user(user)
        if dept_id is None:
            return qs.none()
        return qs.filter(**{path: dept_id})

    return _scoped

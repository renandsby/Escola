from core.scopes import apply_scope

from apps.curriculum.models import Subject

from ._scope import scope_by_department_path


def get_subjects_for_user(*, user):
    qs = Subject.objects.filter(is_active=True).select_related('education_department')
    return apply_scope(
        qs,
        user,
        department_field='education_department_id',
        school_field=scope_by_department_path('education_department_id'),
    )

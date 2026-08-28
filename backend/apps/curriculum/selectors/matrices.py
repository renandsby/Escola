from core.scopes import apply_scope

from apps.curriculum.models import CurriculumMatrix, CurriculumMatrixItem

from ._scope import scope_by_department_path


def get_curriculum_matrices_for_user(*, user):
    qs = (
        CurriculumMatrix.objects.filter(is_active=True)
        .select_related('education_department', 'education_stage')
        .prefetch_related('items', 'items__subject')
    )
    return apply_scope(
        qs,
        user,
        department_field='education_department_id',
        school_field=scope_by_department_path('education_department_id'),
    )


def get_curriculum_matrix_items_for_user(*, user):
    qs = CurriculumMatrixItem.objects.filter(is_active=True).select_related(
        'curriculum_matrix',
        'subject',
    )
    return apply_scope(
        qs,
        user,
        department_field='curriculum_matrix__education_department_id',
        school_field=scope_by_department_path('curriculum_matrix__education_department_id'),
    )

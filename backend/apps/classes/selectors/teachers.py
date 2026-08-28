from django.core.exceptions import ObjectDoesNotExist

from core.scopes import apply_scope

from apps.classes.models import TeacherAllocation, TeacherProfile


def _scope_teacher_own_profile(qs, user):
    try:
        return qs.filter(pk=user.teacher_profile.pk)
    except ObjectDoesNotExist:
        return qs.none()


def get_teacher_profiles_for_user(*, user):
    """Perfis docentes visíveis para o usuário, conforme escopo RBAC."""
    qs = TeacherProfile.objects.filter(deleted_at__isnull=True).select_related(
        'user',
        'education_department',
    )
    qs = apply_scope(
        qs,
        user,
        department_field='education_department_id',
        school_field='allocations__school_class__school_id',
        teacher_class_field=_scope_teacher_own_profile,
    )
    return qs.distinct()


def get_teacher_allocations_for_user(*, user):
    """Alocações docentes visíveis para o usuário, conforme escopo RBAC."""
    qs = TeacherAllocation.objects.select_related(
        'teacher_profile',
        'teacher_profile__user',
        'school_class',
        'subject',
    )
    return apply_scope(
        qs,
        user,
        department_field='school_class__school__education_department_id',
        school_field='school_class__school_id',
        teacher_class_field='school_class_id',
    )

"""Selectors do domínio de governança — dados de referência da rede municipal.

O acesso é restrito a papéis SME (ver ``core.permissions.IsSMEStaff`` nas views);
o escopo por departamento é aplicado aqui via ``apply_scope`` para manter a
ViewSet fina, conforme ``doc/ARCHITECTURE_BACKEND_DJANGO.md``.
"""

from core.scopes import apply_scope

from apps.governance.models import AcademicPeriod, AcademicYear, EducationDepartment, EducationStage


def get_education_departments_for_user(*, user):
    qs = EducationDepartment.objects.filter(is_active=True)
    return apply_scope(qs, user, department_field='id')


def get_academic_years_for_user(*, user):
    qs = AcademicYear.objects.filter(is_active=True).select_related('education_department')
    return apply_scope(qs, user, department_field='education_department_id')


def get_academic_periods_for_user(*, user):
    qs = AcademicPeriod.objects.filter(is_active=True).select_related(
        'academic_year',
        'academic_year__education_department',
    )
    return apply_scope(qs, user, department_field='academic_year__education_department_id')


def get_education_stages():
    """Etapas de ensino são dado de referência global (visível a qualquer autenticado)."""
    return EducationStage.objects.filter(is_active=True)

"""Escopo de queryset por papel (RBAC hierárquico SME — Design Doc §5)."""

from __future__ import annotations

from typing import Any, Callable

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import QuerySet

from core.models import UserRole

# Lookup ORM (str) ou callable(qs, user) -> qs filtrado
ScopeLookup = str | Callable[[QuerySet, Any], QuerySet]


def _teacher_allocated_class_ids(user) -> QuerySet:
    """IDs de turmas alocadas ao professor via TeacherAllocation."""
    from apps.classes.models import TeacherAllocation

    try:
        profile = user.teacher_profile
    except ObjectDoesNotExist:
        return TeacherAllocation.objects.none().values_list('school_class_id', flat=True)

    return TeacherAllocation.objects.filter(teacher_profile=profile).values_list(
        'school_class_id',
        flat=True,
    )


def _accessible_student_ids(user) -> set:
    """
    Alunos visíveis para student_guardian:
    - o próprio Student (student_profile), e/ou
    - alunos vinculados via Guardian.student_links (StudentGuardian).
    """
    ids: set = set()
    try:
        ids.add(user.student_profile.pk)
    except ObjectDoesNotExist:
        pass
    try:
        guardian = user.guardian_profile
        ids.update(guardian.student_links.values_list('student_id', flat=True))
    except ObjectDoesNotExist:
        pass
    return ids


def _resolve_lookup(qs: QuerySet, user, lookup: ScopeLookup | None, value) -> QuerySet:
    """Aplica lookup string (`field=value`) ou callable customizado."""
    if lookup is None:
        return qs.none()
    if callable(lookup):
        return lookup(qs, user)
    return qs.filter(**{lookup: value})


def apply_scope(
    qs: QuerySet,
    user,
    *,
    department_field: ScopeLookup | None = None,
    school_field: ScopeLookup | None = None,
    teacher_class_field: ScopeLookup | None = None,
    student_field: ScopeLookup | None = None,
) -> QuerySet:
    """
    Filtra o queryset conforme o papel do usuário.

    - sme_admin / sme_supervisor → department_field = education_department_id
    - school_director / school_secretary → school_field = school_id
    - teacher → teacher_class_field ∈ turmas de TeacherAllocation
    - student_guardian → student_field ∈ alunos do perfil / vínculos de responsável

    Cada ``*_field`` pode ser um caminho ORM (ex.: ``'school_class__school_id'``)
    ou um ``callable(qs, user) -> qs``.
    """
    if not getattr(user, 'is_authenticated', False):
        return qs.none()

    role = getattr(user, 'role', None)

    if role in (UserRole.SME_ADMIN, UserRole.SME_SUPERVISOR):
        dept_id = getattr(user, 'education_department_id', None)
        if dept_id is None:
            return qs.none()
        return _resolve_lookup(qs, user, department_field, dept_id)

    if role in (UserRole.SCHOOL_DIRECTOR, UserRole.SCHOOL_SECRETARY):
        school_id = getattr(user, 'school_id', None)
        if school_id is None:
            return qs.none()
        return _resolve_lookup(qs, user, school_field, school_id)

    if role == UserRole.TEACHER:
        if teacher_class_field is None:
            return qs.none()
        if callable(teacher_class_field):
            return teacher_class_field(qs, user)
        class_ids = _teacher_allocated_class_ids(user)
        return qs.filter(**{f'{teacher_class_field}__in': class_ids})

    if role == UserRole.STUDENT_GUARDIAN:
        if student_field is None:
            return qs.none()
        if callable(student_field):
            return student_field(qs, user)
        student_ids = _accessible_student_ids(user)
        if not student_ids:
            return qs.none()
        return qs.filter(**{f'{student_field}__in': student_ids})

    return qs.none()


class ScopedQuerySetMixin:
    """
    Mixin para ViewSets: filtra ``get_queryset`` pelo escopo do papel.

    Atributos de classe (caminhos ORM ou callables):

    - ``scope_department_field`` — rede municipal (SME)
    - ``scope_school_field`` — unidade escolar (direção / secretaria)
    - ``scope_via_teacher_allocation`` — se True, restringe turmas via TeacherAllocation
    - ``scope_teacher_class_field`` — campo/caminho até a turma (default ``'id'``)
    - ``scope_student_field`` — campo/caminho até o aluno (aluno/responsável)

    Exemplo (turmas)::

        class SchoolClassViewSet(ScopedQuerySetMixin, viewsets.ModelViewSet):
            scope_department_field = 'school__education_department_id'
            scope_school_field = 'school_id'
            scope_via_teacher_allocation = True
            scope_teacher_class_field = 'id'
            scope_student_field = 'enrollments__student_id'
    """

    scope_department_field: ScopeLookup | None = None
    scope_school_field: ScopeLookup | None = None
    scope_via_teacher_allocation: bool = False
    scope_teacher_class_field: ScopeLookup | None = None
    scope_student_field: ScopeLookup | None = None

    # Alternativa declarativa (lookups nomeados); valores str ou callable.
    scope_lookups: dict[str, ScopeLookup] = {}

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        department_field = self.scope_department_field or self.scope_lookups.get('department')
        school_field = self.scope_school_field or self.scope_lookups.get('school')
        student_field = self.scope_student_field or self.scope_lookups.get('student_guardian')

        teacher_class_field: ScopeLookup | None = None
        if self.scope_via_teacher_allocation:
            teacher_class_field = (
                self.scope_teacher_class_field
                or self.scope_lookups.get('teacher')
                or 'id'
            )
        elif 'teacher' in self.scope_lookups:
            teacher_class_field = self.scope_lookups['teacher']

        return apply_scope(
            qs,
            user,
            department_field=department_field,
            school_field=school_field,
            teacher_class_field=teacher_class_field,
            student_field=student_field,
        )

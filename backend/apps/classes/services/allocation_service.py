"""Regras de negócio de alocação docente.

Além do vínculo único (professor + turma + disciplina), impede que um mesmo
docente seja alocado a duas turmas cujos turnos se sobrepõem no mesmo ano
letivo — não é possível reger duas salas ao mesmo tempo.
"""

from django.db import transaction

from core.exceptions import BusinessLogicError

from apps.classes.models import SchoolClass, TeacherAllocation, TeacherProfile
from apps.classes.models.school_class import shifts_conflict
from apps.curriculum.models import Subject


@transaction.atomic
def allocate_teacher(
    *,
    teacher_profile_id,
    school_class_id,
    subject_id=None,
    is_regent=False,
    actor_user=None,
) -> TeacherAllocation:
    teacher_profile = (
        TeacherProfile.objects.select_for_update()
        .filter(id=teacher_profile_id, deleted_at__isnull=True)
        .first()
    )
    if not teacher_profile:
        raise BusinessLogicError(
            code="TEACHER_NOT_FOUND",
            message="Perfil docente informado não existe.",
            status_code=404,
        )

    school_class = (
        SchoolClass.objects.select_related('academic_year')
        .filter(id=school_class_id, deleted_at__isnull=True)
        .first()
    )
    if not school_class:
        raise BusinessLogicError(
            code="CLASS_NOT_FOUND",
            message="Turma informada não existe.",
            status_code=404,
        )

    subject = None
    if subject_id:
        subject = Subject.objects.filter(id=subject_id, is_active=True).first()
        if not subject:
            raise BusinessLogicError(
                code="SUBJECT_NOT_FOUND",
                message="Disciplina informada não existe.",
                status_code=404,
            )

    duplicate = TeacherAllocation.objects.filter(
        teacher_profile=teacher_profile,
        school_class=school_class,
        subject=subject,
    ).exists()
    if duplicate:
        raise BusinessLogicError(
            code="DUPLICATE_ALLOCATION",
            message="Este docente já está alocado nesta turma para esta disciplina.",
        )

    concurrent_allocations = (
        TeacherAllocation.objects.filter(
            teacher_profile=teacher_profile,
            school_class__academic_year_id=school_class.academic_year_id,
            school_class__deleted_at__isnull=True,
        )
        .exclude(school_class_id=school_class.id)
        .select_related('school_class')
    )
    for allocation in concurrent_allocations:
        if shifts_conflict(school_class.shift, allocation.school_class.shift):
            raise BusinessLogicError(
                code="TEACHER_SCHEDULE_CONFLICT",
                message=(
                    f"Docente já alocado à turma '{allocation.school_class.name}' "
                    f"em turno conflitante no mesmo ano letivo."
                ),
            )

    return TeacherAllocation.objects.create(
        teacher_profile=teacher_profile,
        school_class=school_class,
        subject=subject,
        is_regent=is_regent,
    )

"""Ciclo de admissão — criação e avanço de estado (DX-SGE-004)."""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from core.exceptions import BusinessLogicError
from apps.audit.services.audit_service import log_action
from apps.admissions.models import AdmissionCycle, AdmissionCycleStatus


@transaction.atomic
def create_cycle(*, education_department, target_academic_year, name, windows, actor_user):
    """``windows`` = dict com renewal_opens_at/renewal_closes_at/
    new_request_opens_at/new_request_closes_at."""
    if AdmissionCycle.objects.filter(
        education_department=education_department,
        target_academic_year=target_academic_year,
    ).exists():
        raise BusinessLogicError(
            code='CYCLE_ALREADY_EXISTS',
            message='Já existe um ciclo de admissão para este ano letivo.',
        )

    cycle = AdmissionCycle(
        education_department=education_department,
        target_academic_year=target_academic_year,
        name=name,
        **windows,
    )
    try:
        cycle.full_clean(exclude=['status'])
    except DjangoValidationError as exc:
        raise BusinessLogicError(
            code='INVALID_CYCLE_WINDOWS',
            message='; '.join(m for msgs in exc.message_dict.values() for m in msgs),
        )
    cycle.save()
    log_action(
        user=actor_user,
        action='ADMISSION_CYCLE_CREATED',
        resource='admissions',
        resource_id=str(cycle.id),
        details={'year': target_academic_year.year},
    )
    return cycle


@transaction.atomic
def advance_status(*, cycle_id, actor_user) -> AdmissionCycle:
    cycle = AdmissionCycle.objects.select_for_update().filter(id=cycle_id).first()
    if cycle is None:
        raise BusinessLogicError(
            code='CYCLE_NOT_FOUND', message='Ciclo não encontrado.', status_code=404
        )
    nxt = cycle.next_status
    if nxt is None:
        raise BusinessLogicError(
            code='CYCLE_ALREADY_FINAL',
            message='O ciclo já está no último estado.',
        )
    previous = cycle.status
    cycle.status = nxt
    cycle.save(update_fields=['status', 'updated_at'])
    log_action(
        user=actor_user,
        action='ADMISSION_CYCLE_ADVANCED',
        resource='admissions',
        resource_id=str(cycle.id),
        details={'from': previous, 'to': nxt},
    )
    return cycle

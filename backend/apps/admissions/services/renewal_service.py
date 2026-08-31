"""Rematrícula — convites, confirmação do responsável e materialização
da matrícula do ano de destino (DX-SGE-004)."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError
from apps.audit.services.audit_service import log_action
from apps.classes.models import SchoolClass
from apps.notifications.services.notification_service import notify_user
from apps.students.models import Enrollment, EnrollmentStatus, Guardian
from apps.students.services.enrollment_service import enroll_student_in_class
from apps.admissions.models import (
    AdmissionCycle,
    EnrollmentRequest,
    EnrollmentRequestStatus,
    RenewalOutcome,
    RenewalRequest,
    RequestOrigin,
)

_PORTAL_LINK = '/minhas-admissoes'


def _guardian_for_user(user) -> Guardian:
    guardian = getattr(user, 'guardian_profile', None)
    if guardian is None:
        raise BusinessLogicError(
            code='NOT_A_GUARDIAN',
            message='Apenas responsáveis com cadastro podem confirmar a rematrícula.',
            status_code=403,
        )
    return guardian


@transaction.atomic
def open_renewal_invites(*, cycle_id, actor_user) -> dict:
    """Cria uma ``RenewalRequest`` PENDING para cada aluno com matrícula ativa
    na rede (ano anterior ao de destino) e notifica os responsáveis. Idempotente."""
    cycle = AdmissionCycle.objects.select_related('target_academic_year').filter(id=cycle_id).first()
    if cycle is None:
        raise BusinessLogicError(code='CYCLE_NOT_FOUND', message='Ciclo não encontrado.', status_code=404)

    prev_year = cycle.target_academic_year.year - 1
    active = (
        Enrollment.objects.filter(
            status=EnrollmentStatus.ENROLLED,
            deleted_at__isnull=True,
            school_class__school__education_department=cycle.education_department,
            school_class__academic_year__year=prev_year,
        )
        .select_related('student', 'school_class', 'school_class__school')
    )

    created, notified = 0, 0
    existing = set(
        RenewalRequest.objects.filter(cycle=cycle).values_list('student_id', flat=True)
    )
    for enr in active.iterator():
        if enr.student_id in existing:
            continue
        renewal = RenewalRequest.objects.create(
            cycle=cycle,
            student=enr.student,
            current_enrollment=enr,
        )
        created += 1
        for link in enr.student.guardian_links.select_related('guardian__user'):
            gu = link.guardian.user
            if gu is not None:
                notify_user(
                    user=gu,
                    title='Rematrícula aberta',
                    message=(
                        f'Confirme a rematrícula de {enr.student.full_name} para '
                        f'{cycle.target_academic_year.year}.'
                    ),
                    category='admission',
                    link=f'{_PORTAL_LINK}/rematricula/{renewal.id}',
                )
                notified += 1

    log_action(
        user=actor_user,
        action='ADMISSION_RENEWAL_INVITES_OPENED',
        resource='admissions',
        resource_id=str(cycle.id),
        details={'created': created, 'notified': notified},
    )
    return {'created': created, 'notified': notified}


@transaction.atomic
def submit_renewal(
    *,
    renewal_id,
    user,
    outcome: str,
    contact_phone: str = '',
    residential_address: str = '',
    residential_lat=None,
    residential_lng=None,
    has_new_special_needs: bool = False,
    special_needs_note: str = '',
) -> RenewalRequest:
    if outcome not in (
        RenewalOutcome.STAY,
        RenewalOutcome.INTERNAL_TRANSFER,
        RenewalOutcome.NOT_RETURNING,
    ):
        raise BusinessLogicError(code='INVALID_OUTCOME', message='Decisão inválida.')

    guardian = _guardian_for_user(user)
    renewal = (
        RenewalRequest.objects.select_for_update()
        .select_related('cycle', 'student')
        .filter(id=renewal_id)
        .first()
    )
    if renewal is None:
        raise BusinessLogicError(code='RENEWAL_NOT_FOUND', message='Rematrícula não encontrada.', status_code=404)

    if not renewal.student.guardian_links.filter(guardian=guardian).exists():
        raise BusinessLogicError(
            code='SCOPE_FORBIDDEN',
            message='Você não é responsável por este aluno.',
            status_code=403,
        )
    if not renewal.cycle.is_renewal_open():
        raise BusinessLogicError(
            code='RENEWAL_WINDOW_CLOSED',
            message='A janela de rematrícula não está aberta.',
        )

    renewal.outcome = outcome
    renewal.guardian = guardian
    renewal.contact_phone = contact_phone or ''
    renewal.residential_address = residential_address or ''
    renewal.residential_lat = residential_lat
    renewal.residential_lng = residential_lng
    renewal.has_new_special_needs = bool(has_new_special_needs)
    renewal.special_needs_note = special_needs_note or ''
    renewal.confirmed_at = timezone.now()
    renewal.save()

    if outcome == RenewalOutcome.INTERNAL_TRANSFER:
        _spawn_transfer_request(renewal, guardian)

    log_action(
        user=user,
        action='ADMISSION_RENEWAL_SUBMITTED',
        resource='admissions',
        resource_id=str(renewal.id),
        details={'outcome': outcome},
    )
    return renewal


def _spawn_transfer_request(renewal: RenewalRequest, guardian: Guardian) -> EnrollmentRequest:
    req, _ = EnrollmentRequest.objects.get_or_create(
        cycle=renewal.cycle,
        student=renewal.student,
        defaults={
            'guardian': guardian,
            'origin': RequestOrigin.RENEWAL_TRANSFER,
            'renewal_request': renewal,
            'desired_shift': renewal.current_enrollment.school_class.shift,
            'target_grade_label': '',
            'residential_address': renewal.residential_address or '',
            'residential_lat': renewal.residential_lat,
            'residential_lng': renewal.residential_lng,
            'status': EnrollmentRequestStatus.DRAFT,
        },
    )
    return req


@transaction.atomic
def materialize_renewal(*, renewal_id, school_class_id, actor_user) -> Enrollment:
    """Ação da secretaria: cria a matrícula do ano de destino para quem
    confirmou permanência. A turma N+1 é escolhida manualmente (não há
    progressão automática de série no V1)."""
    renewal = (
        RenewalRequest.objects.select_for_update()
        .select_related('cycle', 'cycle__target_academic_year', 'student', 'current_enrollment')
        .filter(id=renewal_id)
        .first()
    )
    if renewal is None:
        raise BusinessLogicError(code='RENEWAL_NOT_FOUND', message='Rematrícula não encontrada.', status_code=404)
    if renewal.outcome != RenewalOutcome.STAY:
        raise BusinessLogicError(
            code='RENEWAL_NOT_STAY',
            message='Só é possível materializar rematrículas com permanência confirmada.',
        )
    if renewal.next_enrollment_id:
        raise BusinessLogicError(
            code='RENEWAL_ALREADY_MATERIALIZED',
            message='Esta rematrícula já gerou uma matrícula.',
        )

    target_class = SchoolClass.objects.filter(id=school_class_id, deleted_at__isnull=True).first()
    if target_class is None:
        raise BusinessLogicError(code='CLASS_NOT_FOUND', message='Turma não encontrada.', status_code=404)
    if target_class.academic_year_id != renewal.cycle.target_academic_year_id:
        raise BusinessLogicError(
            code='CLASS_WRONG_YEAR',
            message='A turma não pertence ao ano letivo de destino do ciclo.',
        )
    if target_class.school_id != renewal.current_enrollment.school_class.school_id:
        raise BusinessLogicError(
            code='CLASS_WRONG_SCHOOL',
            message='Na permanência, a turma deve ser da mesma escola de origem.',
        )

    enrollment = enroll_student_in_class(
        student_id=renewal.student_id,
        school_class_id=target_class.id,
        actor_user=actor_user,
    )
    renewal.next_enrollment = enrollment
    renewal.save(update_fields=['next_enrollment', 'updated_at'])

    log_action(
        user=actor_user,
        action='ADMISSION_RENEWAL_MATERIALIZED',
        resource='admissions',
        resource_id=str(renewal.id),
        details={'enrollment_id': str(enrollment.id)},
    )
    for link in renewal.student.guardian_links.select_related('guardian__user'):
        if link.guardian.user_id:
            notify_user(
                user=link.guardian.user,
                title='Rematrícula efetivada',
                message=f'{renewal.student.full_name} está matriculado(a) em {target_class}.',
                category='admission',
                link=_PORTAL_LINK,
            )
    return enrollment

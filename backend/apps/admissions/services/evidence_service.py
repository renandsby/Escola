"""Verificação dos comprovantes de prioridade pela escola/SME (DX-SGE-004)."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError
from core.models import UserRole
from apps.audit.services.audit_service import log_action
from apps.notifications.services.notification_service import notify_user
from apps.admissions.models import EvidenceStatus, PriorityEvidence

_STAFF_ROLES = {
    UserRole.SME_ADMIN,
    UserRole.SME_SUPERVISOR,
    UserRole.SCHOOL_DIRECTOR,
    UserRole.SCHOOL_SECRETARY,
}


@transaction.atomic
def verify_evidence(*, evidence_id, decision: str, actor_user, note: str = '') -> PriorityEvidence:
    if getattr(actor_user, 'role', None) not in _STAFF_ROLES:
        raise BusinessLogicError(
            code='SCOPE_FORBIDDEN',
            message='Apenas equipe da escola ou da SME pode verificar comprovantes.',
            status_code=403,
        )
    if decision not in (EvidenceStatus.VERIFIED, EvidenceStatus.REJECTED):
        raise BusinessLogicError(code='INVALID_DECISION', message='Decisão inválida.')

    evidence = (
        PriorityEvidence.objects.select_for_update(of=('self',))
        .select_related('request', 'request__guardian', 'request__student')
        .filter(id=evidence_id)
        .first()
    )
    if evidence is None:
        raise BusinessLogicError(
            code='EVIDENCE_NOT_FOUND', message='Comprovante não encontrado.', status_code=404
        )
    if evidence.status != EvidenceStatus.PENDING:
        raise BusinessLogicError(
            code='EVIDENCE_ALREADY_REVIEWED',
            message='Este comprovante já foi verificado.',
        )
    if decision == EvidenceStatus.REJECTED and not note.strip():
        raise BusinessLogicError(
            code='REJECTION_NOTE_REQUIRED',
            message='Informe o motivo da rejeição.',
        )

    evidence.status = decision
    evidence.verified_by = actor_user
    evidence.verified_at = timezone.now()
    evidence.review_note = note or ''
    evidence.save(update_fields=['status', 'verified_by', 'verified_at', 'review_note', 'updated_at'])

    log_action(
        user=actor_user,
        action='ADMISSION_EVIDENCE_VERIFIED',
        resource='admissions',
        resource_id=str(evidence.id),
        details={'decision': decision, 'kind': evidence.kind},
    )
    guardian_user = getattr(evidence.request.guardian, 'user', None)
    if guardian_user is not None:
        verb = 'confirmado' if decision == EvidenceStatus.VERIFIED else 'rejeitado'
        notify_user(
            user=guardian_user,
            title='Comprovante de prioridade ' + verb,
            message=(
                f'O comprovante "{evidence.get_kind_display()}" da solicitação de '
                f'{evidence.request.applicant_display} foi {verb}.'
            ),
            category='admission',
            link='/minhas-admissoes',
        )
    return evidence

from django.utils import timezone

from core.exceptions import BusinessLogicError
from apps.students.models import TransferRequest, TransferRequestStatus


def authorize_transfer(*, transfer_id, destination_school_id=None, actor_user) -> TransferRequest:
    transfer = TransferRequest.objects.filter(id=transfer_id, deleted_at__isnull=True).first()
    if not transfer:
        raise BusinessLogicError(
            code="TRANSFER_NOT_FOUND",
            message="Solicitação de transferência informada não existe.",
            status_code=404,
        )

    if transfer.status != TransferRequestStatus.PENDING_SME:
        raise BusinessLogicError(
            code="INVALID_STATUS_TRANSITION",
            message="Somente solicitações pendentes podem ser autorizadas.",
        )

    destination = destination_school_id or transfer.destination_school_id
    if destination:
        transfer.destination_school_id = destination
    transfer.status = TransferRequestStatus.APPROVED_BY_SME
    transfer.save(update_fields=['destination_school', 'status', 'updated_at'])
    return transfer


def accept_transfer(*, transfer_id, actor_user) -> TransferRequest:
    transfer = TransferRequest.objects.filter(id=transfer_id, deleted_at__isnull=True).first()
    if not transfer:
        raise BusinessLogicError(
            code="TRANSFER_NOT_FOUND",
            message="Solicitação de transferência informada não existe.",
            status_code=404,
        )

    if transfer.status != TransferRequestStatus.APPROVED_BY_SME:
        raise BusinessLogicError(
            code="INVALID_STATUS_TRANSITION",
            message="Somente solicitações aprovadas pela SME podem ser aceitas.",
        )

    if not transfer.destination_school_id:
        raise BusinessLogicError(
            code="DESTINATION_SCHOOL_REQUIRED",
            message="Escola de destino é obrigatória para aceitar a transferência.",
        )

    if transfer.destination_school_id != getattr(actor_user, 'school_id', None):
        raise BusinessLogicError(
            code="NOT_DESTINATION_SCHOOL",
            message="Apenas a escola de destino pode aceitar a transferência.",
            status_code=403,
        )

    transfer.status = TransferRequestStatus.ACCEPTED_BY_DESTINATION
    transfer.resolved_at = timezone.now()
    transfer.save(update_fields=['status', 'resolved_at', 'updated_at'])
    return transfer

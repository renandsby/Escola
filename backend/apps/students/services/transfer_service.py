from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError
from core.models import UserRole

from apps.classes.models import SchoolClass
from apps.notifications.services.notification_service import notify_role
from apps.students.models import Enrollment, EnrollmentStatus, TransferRequest, TransferRequestStatus
from apps.students.services.enrollment_service import enroll_student_in_class

_TRANSFERS_LINK = '/transferencias'


def _notify_transfer(transfer, *, title, message):
    """Avisa a direção da origem, do destino e a SME sobre o andamento."""
    student = transfer.student.full_name
    body = f'{student}: {message}'
    if transfer.origin_school_id:
        notify_role(
            role=UserRole.SCHOOL_DIRECTOR, school_id=transfer.origin_school_id,
            title=title, message=body, category='transfer', link=_TRANSFERS_LINK,
        )
    if transfer.destination_school_id:
        notify_role(
            role=UserRole.SCHOOL_DIRECTOR, school_id=transfer.destination_school_id,
            title=title, message=body, category='transfer', link=_TRANSFERS_LINK,
        )
    dept_id = getattr(transfer.origin_school, 'education_department_id', None)
    if dept_id:
        notify_role(
            role=UserRole.SME_ADMIN, department_id=dept_id,
            title=title, message=body, category='transfer', link=_TRANSFERS_LINK,
        )


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
    _notify_transfer(
        transfer,
        title='Transferência autorizada pela SME',
        message='a solicitação foi autorizada e aguarda o aceite da escola de destino.',
    )
    return transfer


@transaction.atomic
def accept_transfer(*, transfer_id, destination_class_id=None, actor_user) -> TransferRequest:
    """Efetiva a transferência: encerra a matrícula de origem e, se houver turma
    de destino, matricula o aluno lá (com trava de capacidade). Tudo atômico —
    turma sem vaga faz rollback completo.
    """
    transfer = (
        TransferRequest.objects.select_for_update(of=('self',))
        .select_related('student', 'origin_school', 'destination_school', 'academic_year')
        .filter(id=transfer_id, deleted_at__isnull=True)
        .first()
    )
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

    is_sme_admin = getattr(actor_user, 'role', None) == UserRole.SME_ADMIN
    if not is_sme_admin and transfer.destination_school_id != getattr(actor_user, 'school_id', None):
        raise BusinessLogicError(
            code="NOT_DESTINATION_SCHOOL",
            message="Apenas a escola de destino (ou a SME) pode aceitar a transferência.",
            status_code=403,
        )

    # encerra a matrícula ativa do aluno no ano letivo da solicitação. Preferimos a
    # matrícula na escola de origem declarada; se não houver (dado inconsistente),
    # encerra a matrícula ativa onde quer que o aluno esteja — o efeito real é o
    # aluno sair de onde está para a escola de destino.
    active_year_enrollments = (
        Enrollment.objects.select_for_update()
        .filter(
            student_id=transfer.student_id,
            school_class__academic_year_id=transfer.academic_year_id,
            status=EnrollmentStatus.ENROLLED,
            deleted_at__isnull=True,
        )
    )
    origin_enrollment = (
        active_year_enrollments.filter(
            school_class__school_id=transfer.origin_school_id
        ).first()
        or active_year_enrollments.first()
    )
    same_department = (
        transfer.origin_school.education_department_id
        == transfer.destination_school.education_department_id
    )
    exit_status = (
        EnrollmentStatus.TRANSFERRED_INTERNAL
        if same_department
        else EnrollmentStatus.TRANSFERRED_EXTERNAL
    )
    if origin_enrollment:
        origin_enrollment.status = exit_status
        origin_enrollment.save(update_fields=['status', 'updated_at'])

    new_enrollment = None
    if destination_class_id:
        klass = SchoolClass.objects.filter(
            id=destination_class_id,
            school_id=transfer.destination_school_id,
            deleted_at__isnull=True,
        ).first()
        if not klass:
            raise BusinessLogicError(
                code="CLASS_NOT_FOUND",
                message="Turma de destino não existe ou não pertence à escola de destino.",
                status_code=404,
            )
        new_enrollment = enroll_student_in_class(
            student_id=transfer.student_id,
            school_class_id=destination_class_id,
            actor_user=actor_user,
        )

    transfer.status = TransferRequestStatus.ACCEPTED_BY_DESTINATION
    transfer.resolved_at = timezone.now()
    transfer.target_enrollment = new_enrollment
    transfer.save(update_fields=['status', 'resolved_at', 'target_enrollment', 'updated_at'])
    _notify_transfer(
        transfer,
        title='Transferência efetivada',
        message='a escola de destino aceitou e o aluno foi movimentado.',
    )
    return transfer


def reject_transfer(*, transfer_id, actor_user, reason='') -> TransferRequest:
    transfer = TransferRequest.objects.filter(id=transfer_id, deleted_at__isnull=True).first()
    if not transfer:
        raise BusinessLogicError(
            code="TRANSFER_NOT_FOUND",
            message="Solicitação de transferência informada não existe.",
            status_code=404,
        )
    if transfer.status in (
        TransferRequestStatus.ACCEPTED_BY_DESTINATION,
        TransferRequestStatus.REJECTED,
        TransferRequestStatus.CANCELLED,
    ):
        raise BusinessLogicError(
            code="INVALID_STATUS_TRANSITION",
            message="Esta solicitação já foi finalizada.",
        )
    transfer.status = TransferRequestStatus.REJECTED
    transfer.resolved_at = timezone.now()
    if reason:
        transfer.reason = f'{transfer.reason}\n\n[Recusa] {reason}'.strip()
    transfer.save(update_fields=['status', 'resolved_at', 'reason', 'updated_at'])
    _notify_transfer(
        transfer,
        title='Transferência recusada',
        message=f'a solicitação foi recusada. {reason}'.strip(),
    )
    return transfer

"""Solicitação de matrícula (novo entrante / transferência interna) —
rascunho, preferências, comprovantes e envio (DX-SGE-004)."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError
from core.files import validate_upload
from core.validators import normalize_cpf
from apps.audit.services.audit_service import log_action
from apps.governance.models import ConsentType
from apps.governance.services.privacy_service import register_student_consent
from apps.notifications.services.notification_service import notify_user
from apps.schools.models import School
from apps.students.models import Guardian, Student
from apps.admissions.models import (
    AdmissionCycle,
    EnrollmentRequest,
    EnrollmentRequestStatus,
    EvidenceKind,
    PriorityEvidence,
    RequestOrigin,
    SchoolPreference,
)

_MAX_PREFERENCES = 3


def _guardian_for_user(user) -> Guardian:
    guardian = getattr(user, 'guardian_profile', None)
    if guardian is None:
        raise BusinessLogicError(
            code='NOT_A_GUARDIAN',
            message='Apenas responsáveis com cadastro podem solicitar matrícula.',
            status_code=403,
        )
    return guardian


def _owned_request(request_id, user) -> EnrollmentRequest:
    guardian = _guardian_for_user(user)
    req = (
        EnrollmentRequest.objects.select_related('cycle', 'student')
        .filter(id=request_id, guardian=guardian)
        .first()
    )
    if req is None:
        raise BusinessLogicError(
            code='REQUEST_NOT_FOUND',
            message='Solicitação não encontrada.',
            status_code=404,
        )
    return req


@transaction.atomic
def create_request(
    *,
    user,
    cycle_id,
    desired_shift: str,
    target_grade_label: str,
    residential_address: str,
    residential_lat=None,
    residential_lng=None,
    student_id=None,
    applicant_name: str = '',
    applicant_cpf: str = '',
    applicant_birth_date=None,
    applicant_mother_name: str = '',
) -> EnrollmentRequest:
    guardian = _guardian_for_user(user)
    cycle = AdmissionCycle.objects.filter(id=cycle_id).first()
    if cycle is None:
        raise BusinessLogicError(code='CYCLE_NOT_FOUND', message='Ciclo não encontrado.', status_code=404)
    if not cycle.is_new_request_open():
        raise BusinessLogicError(
            code='NEW_REQUEST_WINDOW_CLOSED',
            message='A janela de novas matrículas não está aberta.',
        )

    student = None
    if student_id:
        student = Student.objects.filter(id=student_id, deleted_at__isnull=True).first()
        if student is None:
            raise BusinessLogicError(code='STUDENT_NOT_FOUND', message='Aluno não encontrado.', status_code=404)
        if not student.guardian_links.filter(guardian=guardian).exists():
            raise BusinessLogicError(
                code='SCOPE_FORBIDDEN',
                message='Você não é responsável por este aluno.',
                status_code=403,
            )
        if EnrollmentRequest.objects.filter(cycle=cycle, student=student).exists():
            raise BusinessLogicError(
                code='REQUEST_ALREADY_EXISTS',
                message='Já existe uma solicitação para este aluno neste ciclo.',
            )
    else:
        if not (applicant_name and applicant_cpf and applicant_birth_date and applicant_mother_name):
            raise BusinessLogicError(
                code='APPLICANT_DATA_REQUIRED',
                message='Informe nome, CPF, data de nascimento e nome da mãe do candidato.',
            )
        applicant_cpf = normalize_cpf(applicant_cpf)
        _check_applicant_duplicate(applicant_cpf, cycle)

    req = EnrollmentRequest.objects.create(
        cycle=cycle,
        guardian=guardian,
        origin=RequestOrigin.NEW,
        student=student,
        applicant_name=applicant_name or '',
        applicant_cpf=applicant_cpf or None,
        applicant_birth_date=applicant_birth_date,
        applicant_mother_name=applicant_mother_name or '',
        desired_shift=desired_shift,
        target_grade_label=target_grade_label,
        residential_address=residential_address,
        residential_lat=residential_lat,
        residential_lng=residential_lng,
        status=EnrollmentRequestStatus.DRAFT,
    )
    return req


def _check_applicant_duplicate(cpf: str, cycle: AdmissionCycle) -> None:
    existing_student = Student.objects.filter(cpf=cpf, deleted_at__isnull=True).first()
    if existing_student:
        raise BusinessLogicError(
            code='APPLICANT_ALREADY_REGISTERED',
            message=(
                'Já existe um aluno com este CPF na rede. Vincule-se a ele como '
                'responsável e refaça a solicitação selecionando o aluno existente.'
            ),
        )
    if (
        EnrollmentRequest.objects.filter(cycle=cycle, applicant_cpf=cpf, student__isnull=True)
        .exists()
    ):
        raise BusinessLogicError(
            code='REQUEST_ALREADY_EXISTS',
            message='Já existe uma solicitação para este CPF neste ciclo.',
        )


@transaction.atomic
def set_preferences(*, request_id, user, school_ids: list) -> EnrollmentRequest:
    req = _owned_request(request_id, user)
    _assert_draft(req)

    school_ids = [str(s) for s in school_ids]
    if not (1 <= len(school_ids) <= _MAX_PREFERENCES):
        raise BusinessLogicError(
            code='INVALID_PREFERENCE_COUNT',
            message=f'Selecione de 1 a {_MAX_PREFERENCES} escolas.',
        )
    if len(set(school_ids)) != len(school_ids):
        raise BusinessLogicError(
            code='DUPLICATE_PREFERENCE',
            message='As escolas escolhidas devem ser diferentes.',
        )
    schools = {str(s.id): s for s in School.objects.filter(id__in=school_ids, deleted_at__isnull=True)}
    if len(schools) != len(school_ids):
        raise BusinessLogicError(code='SCHOOL_NOT_FOUND', message='Escola inválida na seleção.', status_code=404)

    req.preferences.all().delete()
    SchoolPreference.objects.bulk_create([
        SchoolPreference(request=req, rank=i + 1, school=schools[sid])
        for i, sid in enumerate(school_ids)
    ])
    return req


@transaction.atomic
def attach_evidence(
    *,
    request_id,
    user,
    kind: str,
    uploaded_file,
    declared_school_id=None,
) -> PriorityEvidence:
    req = _owned_request(request_id, user)
    _assert_draft(req)
    if kind not in EvidenceKind.values:
        raise BusinessLogicError(code='INVALID_EVIDENCE_KIND', message='Tipo de comprovante inválido.')

    safe_name = validate_upload(uploaded_file)

    declared_school = None
    if kind == EvidenceKind.SIBLING:
        if not declared_school_id:
            raise BusinessLogicError(
                code='SIBLING_SCHOOL_REQUIRED',
                message='Informe a escola em que o irmão está matriculado.',
            )
        declared_school = School.objects.filter(id=declared_school_id, deleted_at__isnull=True).first()
        if declared_school is None:
            raise BusinessLogicError(code='SCHOOL_NOT_FOUND', message='Escola do irmão inválida.', status_code=404)

    return PriorityEvidence.objects.create(
        request=req,
        kind=kind,
        declared_school=declared_school,
        file=uploaded_file,
        file_name=safe_name,
    )


@transaction.atomic
def submit_request(*, request_id, user, lgpd_consent: bool, client_ip=None) -> EnrollmentRequest:
    req = _owned_request(request_id, user)
    _assert_draft(req)

    if not req.cycle.is_new_request_open():
        raise BusinessLogicError(
            code='NEW_REQUEST_WINDOW_CLOSED',
            message='A janela de novas matrículas não está aberta.',
        )
    pref_count = req.preferences.count()
    if not (1 <= pref_count <= _MAX_PREFERENCES):
        raise BusinessLogicError(
            code='PREFERENCES_REQUIRED',
            message=f'Selecione de 1 a {_MAX_PREFERENCES} escolas antes de enviar.',
        )
    if not req.target_grade_label:
        raise BusinessLogicError(code='GRADE_REQUIRED', message='Informe a série pretendida.')
    if lgpd_consent is not True:
        raise BusinessLogicError(
            code='LGPD_CONSENT_REQUIRED',
            message='O aceite dos termos de uso de dados pessoais é obrigatório.',
        )

    if req.student_id:
        record = register_student_consent(
            student=req.student,
            consent_type=ConsentType.ENROLLMENT_DATA_USE,
            granted=True,
            user=user,
            ip_address=client_ip,
        )
        req.lgpd_consent_record = record

    req.status = EnrollmentRequestStatus.AWAITING_PROCESSING
    req.submitted_at = timezone.now()
    req.save(update_fields=['status', 'submitted_at', 'lgpd_consent_record', 'updated_at'])

    log_action(
        user=user,
        action='ADMISSION_REQUEST_SUBMITTED',
        resource='admissions',
        resource_id=str(req.id),
        details={'origin': req.origin, 'preferences': pref_count},
    )
    if req.guardian.user_id:
        notify_user(
            user=req.guardian.user,
            title='Solicitação enviada',
            message=(
                f'A solicitação de matrícula de {req.applicant_display} foi registrada e '
                'aguarda o processamento da secretaria.'
            ),
            category='admission',
            link='/minhas-admissoes',
        )
    return req


def _assert_draft(req: EnrollmentRequest) -> None:
    if req.status != EnrollmentRequestStatus.DRAFT:
        raise BusinessLogicError(
            code='REQUEST_NOT_DRAFT',
            message='A solicitação já foi enviada e não pode mais ser alterada.',
        )

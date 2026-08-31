"""Vinculação aluno–responsável com prova de parentesco (DX-SGE-006).

Dois caminhos:
- **A (aprovação da escola)**: ``request_link`` — o responsável informa CPF +
  data de nascimento + nome da mãe; se conferem, cria-se um vínculo PENDING que a
  escola aprova (``review_link``).
- **B (código)**: ``generate_link_code`` (equipe) + ``redeem_link_code``
  (responsável) — o código é a prova, vínculo já nasce CONFIRMED.
"""

from __future__ import annotations

import hashlib
import re
import secrets
import unicodedata

from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError
from core.models import UserRole
from core.scopes import apply_scope
from core.validators import normalize_cpf
from apps.audit.services.audit_service import log_action
from apps.notifications.services.notification_service import notify_role, notify_user
from apps.students.models import (
    Guardian,
    GuardianLinkCode,
    GuardianLinkMethod,
    GuardianLinkStatus,
    KinshipType,
    Student,
    StudentGuardian,
)

_CODE_TTL_HOURS = 72
_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # sem 0/O/1/I
_PORTAL_LINK = '/portal-familia'


# --------------------------------------------------------------------------- #
#  Helpers                                                                     #
# --------------------------------------------------------------------------- #


def _norm_name(value: str) -> str:
    value = unicodedata.normalize('NFKD', value or '').encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', value).strip().lower()


def _clean_code(value: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', (value or '').upper())


def _hash_code(value: str) -> str:
    return hashlib.sha256(_clean_code(value).encode()).hexdigest()


def _random_code() -> str:
    body = ''.join(secrets.choice(_CODE_ALPHABET) for _ in range(8))
    return f'{body[:4]}-{body[4:]}'


def _guardian_for_verified_user(user) -> Guardian:
    from apps.authentication.services.email_verification_service import is_verified

    guardian = getattr(user, 'guardian_profile', None)
    if guardian is None:
        raise BusinessLogicError(
            code='NOT_A_GUARDIAN',
            message='Apenas responsáveis com cadastro podem solicitar vínculo.',
            status_code=403,
        )
    if not is_verified(user):
        raise BusinessLogicError(
            code='EMAIL_NOT_VERIFIED',
            message='Confirme o seu e-mail antes de vincular um aluno.',
            status_code=403,
        )
    return guardian


def _scoped_students(actor_user):
    return apply_scope(
        Student.objects.filter(deleted_at__isnull=True),
        actor_user,
        department_field='education_department_id',
        school_field='enrollments__school_class__school_id',
        teacher_class_field='enrollments__school_class_id',
        student_field='id',
    ).distinct()


def _notify_school_of_student(student: Student, *, title: str, message: str) -> None:
    enrollment = (
        student.enrollments.filter(deleted_at__isnull=True)
        .select_related('school_class__school')
        .order_by('-created_at')
        .first()
    )
    if enrollment is None:
        return
    notify_role(
        role=UserRole.SCHOOL_DIRECTOR,
        school_id=enrollment.school_class.school_id,
        title=title,
        message=message,
        category='guardian_link',
        link='/vinculos-responsaveis',
    )


# --------------------------------------------------------------------------- #
#  Caminho A — aprovação da escola                                             #
# --------------------------------------------------------------------------- #


@transaction.atomic
def request_link(
    *,
    user,
    student_cpf: str,
    birth_date,
    mother_name: str,
    kinship_type: str,
    is_emergency_contact: bool = False,
) -> StudentGuardian:
    guardian = _guardian_for_verified_user(user)
    if kinship_type not in KinshipType.values:
        raise BusinessLogicError(code='INVALID_KINSHIP', message='Parentesco inválido.')

    cpf = normalize_cpf(student_cpf) or ''
    student = Student.objects.filter(cpf=cpf, deleted_at__isnull=True).first()

    # resposta idêntica para "não existe" e "não confere" — não vaza dados
    if (
        student is None
        or student.birth_date != birth_date
        or _norm_name(student.mother_name) != _norm_name(mother_name)
    ):
        raise BusinessLogicError(
            code='STUDENT_MATCH_FAILED',
            message=(
                'Não encontramos um aluno com esses dados. Confira o CPF, a data de '
                'nascimento e o nome da mãe, ou procure a secretaria da escola.'
            ),
        )

    link, created = StudentGuardian.objects.get_or_create(
        student=student,
        guardian=guardian,
        defaults={
            'kinship_type': kinship_type,
            'is_emergency_contact': is_emergency_contact,
            'status': GuardianLinkStatus.PENDING,
            'verification_method': GuardianLinkMethod.SCHOOL_APPROVAL,
            'requested_by': user,
        },
    )
    if not created:
        if link.status == GuardianLinkStatus.CONFIRMED:
            raise BusinessLogicError(
                code='ALREADY_LINKED', message='Você já está vinculado a este aluno.'
            )
        if link.status == GuardianLinkStatus.PENDING:
            raise BusinessLogicError(
                code='REQUEST_PENDING', message='Já existe uma solicitação em análise para este aluno.'
            )
        link.status = GuardianLinkStatus.PENDING
        link.verification_method = GuardianLinkMethod.SCHOOL_APPROVAL
        link.requested_by = user
        link.kinship_type = kinship_type
        link.is_emergency_contact = is_emergency_contact
        link.rejection_note = ''
        link.save()

    _notify_school_of_student(
        student,
        title='Nova solicitação de vínculo de responsável',
        message=f'{guardian.full_name} solicitou vínculo com {student.full_name}.',
    )
    log_action(
        user=user,
        action='GUARDIAN_LINK_REQUESTED',
        resource='guardian-links',
        resource_id=str(link.id),
        details={'student_id': str(student.id)},
    )
    return link


@transaction.atomic
def review_link(*, link_id, decision: str, actor_user, note: str = '') -> StudentGuardian:
    if getattr(actor_user, 'role', None) not in (
        UserRole.SME_ADMIN,
        UserRole.SME_SUPERVISOR,
        UserRole.SCHOOL_DIRECTOR,
        UserRole.SCHOOL_SECRETARY,
    ):
        raise BusinessLogicError(
            code='SCOPE_FORBIDDEN',
            message='Apenas equipe da escola ou da SME pode revisar vínculos.',
            status_code=403,
        )
    if decision not in ('approve', 'reject'):
        raise BusinessLogicError(code='INVALID_DECISION', message='Decisão inválida.')

    link = (
        StudentGuardian.objects.select_for_update(of=('self',))
        .select_related('student', 'guardian', 'requested_by')
        .filter(id=link_id)
        .first()
    )
    if link is None:
        raise BusinessLogicError(code='LINK_NOT_FOUND', message='Vínculo não encontrado.', status_code=404)
    if not _scoped_students(actor_user).filter(id=link.student_id).exists():
        raise BusinessLogicError(
            code='SCOPE_FORBIDDEN',
            message='Este aluno não está no seu escopo.',
            status_code=403,
        )
    if link.status != GuardianLinkStatus.PENDING:
        raise BusinessLogicError(
            code='LINK_ALREADY_REVIEWED', message='Este vínculo já foi revisado.'
        )
    if decision == 'reject' and not note.strip():
        raise BusinessLogicError(code='REJECTION_NOTE_REQUIRED', message='Informe o motivo da recusa.')

    link.status = (
        GuardianLinkStatus.CONFIRMED if decision == 'approve' else GuardianLinkStatus.REJECTED
    )
    link.confirmed_by = actor_user
    link.confirmed_at = timezone.now()
    link.rejection_note = note if decision == 'reject' else ''
    link.save()

    if link.requested_by_id:
        verb = 'confirmado' if decision == 'approve' else 'recusado'
        notify_user(
            user=link.requested_by,
            title=f'Vínculo {verb}',
            message=f'O seu vínculo com {link.student.full_name} foi {verb}.',
            category='guardian_link',
            link=_PORTAL_LINK,
        )
    log_action(
        user=actor_user,
        action='GUARDIAN_LINK_REVIEWED',
        resource='guardian-links',
        resource_id=str(link.id),
        details={'decision': decision},
    )
    return link


# --------------------------------------------------------------------------- #
#  Caminho B — código de vinculação                                            #
# --------------------------------------------------------------------------- #


@transaction.atomic
def generate_link_code(*, student_id, created_by, kinship_hint: str = '', ttl_hours: int = _CODE_TTL_HOURS) -> str:
    student = _scoped_students(created_by).filter(id=student_id).first()
    if student is None:
        raise BusinessLogicError(
            code='SCOPE_FORBIDDEN',
            message='Este aluno não está no seu escopo.',
            status_code=403,
        )
    if kinship_hint and kinship_hint not in KinshipType.values:
        raise BusinessLogicError(code='INVALID_KINSHIP', message='Parentesco sugerido inválido.')

    raw = _random_code()
    GuardianLinkCode.objects.create(
        student=student,
        code_hash=_hash_code(raw),
        created_by=created_by,
        kinship_hint=kinship_hint or '',
        expires_at=timezone.now() + timezone.timedelta(hours=ttl_hours),
    )
    log_action(
        user=created_by,
        action='GUARDIAN_LINK_CODE_GENERATED',
        resource='guardian-links',
        resource_id=str(student.id),
    )
    return raw  # exibido/impresso uma única vez


@transaction.atomic
def redeem_link_code(*, user, student_cpf: str, code: str) -> StudentGuardian:
    guardian = _guardian_for_verified_user(user)
    cpf = normalize_cpf(student_cpf) or ''

    lc = (
        GuardianLinkCode.objects.select_for_update(of=('self',))
        .select_related('student')
        .filter(
            code_hash=_hash_code(code),
            used=False,
            deleted_at__isnull=True,
            student__cpf=cpf,
            student__deleted_at__isnull=True,
            expires_at__gte=timezone.now(),
        )
        .first()
    )
    if lc is None:
        raise BusinessLogicError(
            code='INVALID_LINK_CODE',
            message='Código inválido, expirado ou que não corresponde ao CPF informado.',
        )

    link, _created = StudentGuardian.objects.update_or_create(
        student=lc.student,
        guardian=guardian,
        defaults={
            'kinship_type': lc.kinship_hint or KinshipType.LEGAL_GUARDIAN,
            'status': GuardianLinkStatus.CONFIRMED,
            'verification_method': GuardianLinkMethod.LINK_CODE,
            'requested_by': user,
            'confirmed_at': timezone.now(),
        },
    )
    lc.used = True
    lc.used_by = user
    lc.used_at = timezone.now()
    lc.save(update_fields=['used', 'used_by', 'used_at', 'updated_at'])

    log_action(
        user=user,
        action='GUARDIAN_LINK_CODE_REDEEMED',
        resource='guardian-links',
        resource_id=str(link.id),
        details={'student_id': str(lc.student_id)},
    )
    return link

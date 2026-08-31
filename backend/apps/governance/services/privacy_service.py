"""Serviços de conformidade LGPD — consentimento, portabilidade e anonimização.

- ``record_consent`` — registra (ou revoga) consentimento de um titular.
- ``get_consent_status`` — situação atual por tipo de consentimento.
- ``export_subject_data`` — pacote de portabilidade do titular (art. 18, V).
- ``anonymize_inactive_student`` — anonimização irreversível preservando os
  agregados estatísticos e a integridade referencial do histórico.
"""

from __future__ import annotations

import hashlib

from django.db import transaction
from django.utils import timezone

from core.exceptions import BusinessLogicError
from apps.audit.services.audit_service import log_action
from apps.governance.models import CURRENT_TERM_VERSION, ConsentRecord, ConsentType
from apps.students.models import Enrollment, EnrollmentStatus, Student
from apps.students.selectors.students import get_students_for_user

_ANON_SALT = 'lgpd-anon-v1'


def _resolve_student_in_scope(*, requesting_user, student_id) -> Student:
    """Aluno pedido, desde que visível ao papel do solicitante (RBAC estrito)."""
    student = (
        get_students_for_user(user=requesting_user)
        .filter(id=student_id)
        .first()
    )
    if student is None:
        raise BusinessLogicError(
            code='SCOPE_FORBIDDEN',
            message='Você não tem acesso aos dados deste titular.',
            status_code=403,
        )
    return student


def record_consent(
    *,
    student_id,
    consent_type: str,
    granted: bool,
    requesting_user,
    ip_address: str | None = None,
) -> ConsentRecord:
    if consent_type not in ConsentType.values:
        raise BusinessLogicError(
            code='INVALID_FILTER',
            message='Tipo de consentimento desconhecido.',
        )
    student = _resolve_student_in_scope(
        requesting_user=requesting_user, student_id=student_id
    )
    record = ConsentRecord.objects.create(
        student=student,
        user=requesting_user if getattr(requesting_user, 'is_authenticated', False) else None,
        consent_type=consent_type,
        granted=granted,
        term_version=CURRENT_TERM_VERSION,
        ip_address=ip_address or None,
    )
    log_action(
        user=requesting_user,
        action='CONSENT_GRANTED' if granted else 'CONSENT_REVOKED',
        resource='privacy',
        resource_id=str(student.id),
        details={'consent_type': consent_type, 'term_version': CURRENT_TERM_VERSION},
        ip_address=ip_address,
    )
    return record


def register_student_consent(
    *,
    student,
    consent_type: str,
    granted: bool,
    user,
    ip_address: str | None = None,
) -> ConsentRecord:
    """Registra consentimento para um aluno **já resolvido** — sem checagem de escopo.

    Usado no fluxo de cadastro de aluno (``POST /students/``), onde o titular
    acabou de ser criado pelo próprio solicitante e ainda não tem matrícula que
    o torne visível ao escopo RBAC da escola.
    """
    if consent_type not in ConsentType.values:
        raise BusinessLogicError(
            code='INVALID_FILTER',
            message='Tipo de consentimento desconhecido.',
        )
    record = ConsentRecord.objects.create(
        student=student,
        user=user if getattr(user, 'is_authenticated', False) else None,
        consent_type=consent_type,
        granted=granted,
        term_version=CURRENT_TERM_VERSION,
        ip_address=ip_address or None,
    )
    log_action(
        user=user,
        action='CONSENT_GRANTED' if granted else 'CONSENT_REVOKED',
        resource='privacy',
        resource_id=str(student.id),
        details={'consent_type': consent_type, 'term_version': CURRENT_TERM_VERSION},
        ip_address=ip_address,
    )
    return record


def has_active_consent(*, student, consent_type: str) -> bool:
    """True se o registro mais recente do tipo informado está **concedido**."""
    rec = (
        student.consent_records.filter(consent_type=consent_type)
        .order_by('-granted_at')
        .first()
    )
    return bool(rec and rec.granted)


def get_consent_status(*, student) -> list[dict]:
    """Último registro por tipo — a base do que o titular autorizou hoje."""
    latest: dict[str, ConsentRecord] = {}
    for rec in student.consent_records.all().order_by('granted_at'):
        latest[rec.consent_type] = rec
    out = []
    for value, label in ConsentType.choices:
        rec = latest.get(value)
        out.append(
            {
                'consent_type': value,
                'label': label,
                'granted': bool(rec.granted) if rec else False,
                'term_version': rec.term_version if rec else None,
                'granted_at': rec.granted_at.isoformat() if rec else None,
            }
        )
    return out


def export_subject_data(*, requesting_user, student_id) -> dict:
    """Reúne cadastro, vínculos, notas, frequência e documentos num JSON."""
    student = _resolve_student_in_scope(
        requesting_user=requesting_user, student_id=student_id
    )

    enrollments = (
        Enrollment.objects.filter(student=student, deleted_at__isnull=True)
        .select_related('school_class', 'school_class__school', 'academic_year')
        .order_by('-academic_year__year')
    )
    enrollment_ids = list(enrollments.values_list('id', flat=True))

    from apps.class_diary.models import Attendance, DescriptiveEvaluation, Grade

    payload = {
        'generated_at': timezone.now().isoformat(),
        'subject': {
            'unique_municipal_id': student.unique_municipal_id,
            'full_name': student.full_name,
            'social_name': student.social_name,
            'cpf': student.cpf,
            'birth_date': student.birth_date.isoformat(),
            'gender': student.gender,
            'race_color': student.race_color,
            'mother_name': student.mother_name,
            'father_name': student.father_name,
            'nis_code': student.nis_code,
            'birth_certificate': student.birth_certificate,
            'has_special_needs': student.has_special_needs,
            'special_needs_details': student.special_needs_details,
        },
        'guardians': [
            {
                'full_name': link.guardian.full_name,
                'kinship': link.get_kinship_type_display(),
                'phone': link.guardian.phone,
                'email': link.guardian.email,
                'is_emergency_contact': link.is_emergency_contact,
            }
            for link in student.guardian_links.select_related('guardian')
        ],
        'enrollments': [
            {
                'enrollment_number': e.enrollment_number,
                'academic_year': getattr(e.academic_year, 'year', None),
                'school': e.school_class.school.name if e.school_class else None,
                'school_class': e.school_class.name if e.school_class else None,
                'status': e.status,
            }
            for e in enrollments
        ],
        'grades': [
            {
                'academic_period': g.academic_period.name,
                'subject': g.subject.name,
                'score': str(g.score),
                'recovery_score': str(g.recovery_score) if g.recovery_score is not None else None,
                'final_score': str(g.final_score) if g.final_score is not None else None,
            }
            for g in Grade.objects.filter(enrollment_id__in=enrollment_ids)
            .select_related('academic_period', 'subject')
            .order_by('academic_period__period_number')
        ],
        'attendance_summary': _attendance_summary(Attendance, enrollment_ids),
        'descriptive_evaluations': [
            {
                'academic_period': d.academic_period.name,
                'development_report': d.development_report,
            }
            for d in DescriptiveEvaluation.objects.filter(enrollment_id__in=enrollment_ids)
            .select_related('academic_period')
            .order_by('academic_period__period_number')
        ],
        'documents': [
            {
                'document_type': doc.get_document_type_display(),
                'file_name': doc.file_name,
                'uploaded_at': doc.created_at.isoformat(),
            }
            for doc in student.documents.all().order_by('-created_at')
        ],
        'consents': get_consent_status(student=student),
    }

    log_action(
        user=requesting_user,
        action='SUBJECT_DATA_EXPORTED',
        resource='privacy',
        resource_id=str(student.id),
        details={'enrollments': len(enrollment_ids)},
    )
    return payload


def _attendance_summary(attendance_model, enrollment_ids) -> dict:
    from django.db.models import Count, Q

    if not enrollment_ids:
        return {'total': 0, 'present': 0, 'attendance_pct': None}
    agg = attendance_model.objects.filter(enrollment_id__in=enrollment_ids).aggregate(
        total=Count('id'),
        present=Count('id', filter=Q(status='PRESENT')),
    )
    total = agg['total'] or 0
    pct = round(agg['present'] / total * 100, 1) if total else None
    return {'total': total, 'present': agg['present'] or 0, 'attendance_pct': pct}


@transaction.atomic
def anonymize_inactive_student(*, student_id, actor_user) -> Student:
    """Substitui os dados nominais do aluno por marcadores anônimos.

    Mantém intactos: matrículas, notas, frequência e pareceres (integridade do
    histórico e dos agregados do Censo). Remove: nome, CPF, filiação, contatos e
    o vínculo de login. Operação irreversível — só permitida para aluno sem
    matrícula ativa.
    """
    student = Student.objects.filter(id=student_id, deleted_at__isnull=True).first()
    if student is None:
        raise BusinessLogicError(
            code='STUDENT_NOT_FOUND',
            message='Aluno informado não existe.',
            status_code=404,
        )

    has_active = Enrollment.objects.filter(
        student=student,
        status=EnrollmentStatus.ENROLLED,
        deleted_at__isnull=True,
    ).exists()
    if has_active:
        raise BusinessLogicError(
            code='STUDENT_HAS_ACTIVE_ENROLLMENT',
            message='Não é possível anonimizar um aluno com matrícula ativa.',
        )

    token = hashlib.sha256(
        f'{_ANON_SALT}:{student.id}'.encode()
    ).hexdigest()[:12].upper()

    student.full_name = f'ALUNO ANONIMIZADO {token}'
    student.social_name = ''
    student.cpf = None
    student.birth_certificate = ''
    student.nis_code = ''
    student.mother_name = 'ANONIMIZADO'
    student.father_name = ''
    student.special_needs_details = ''
    student.notes = ''
    # preserva o ano de nascimento (faixa etária do Censo), zera dia/mês
    student.birth_date = student.birth_date.replace(month=1, day=1)
    student.user = None
    student.is_active = False
    student.deleted_at = timezone.now()
    student.save()

    # desvincula responsáveis — o vínculo em si é dado pessoal de terceiros
    student.guardian_links.all().delete()

    log_action(
        user=actor_user,
        action='STUDENT_ANONYMIZED',
        resource='privacy',
        resource_id=str(student.id),
        details={'token': token},
    )
    return student

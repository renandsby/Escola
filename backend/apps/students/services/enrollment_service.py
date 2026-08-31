import uuid

from django.db import transaction

from core.exceptions import BusinessLogicError
from apps.classes.models import SchoolClass
from apps.governance.models import ConsentType
from apps.governance.services.privacy_service import has_active_consent
from apps.students.models import Enrollment, EnrollmentStatus, Student


def _generate_enrollment_number(school_class) -> str:
    """Gera um número de matrícula único como fallback quando não informado."""
    year = getattr(school_class.academic_year, 'year', None) or 'XXXX'
    return f"MAT{year}{uuid.uuid4().hex[:8].upper()}"


@transaction.atomic
def enroll_student_in_class(
    *,
    student_id,
    school_class_id,
    actor_user,
    enrollment_number=None,
    require_lgpd_consent=True,
) -> Enrollment:
    school_class = SchoolClass.objects.select_for_update().filter(
        id=school_class_id,
        deleted_at__isnull=True,
    ).first()
    if not school_class:
        raise BusinessLogicError(
            code="CLASS_NOT_FOUND",
            message="Turma informada não existe.",
            status_code=404,
        )

    student = Student.objects.filter(id=student_id, deleted_at__isnull=True).first()
    if not student:
        raise BusinessLogicError(
            code="STUDENT_NOT_FOUND",
            message="Aluno informado não existe.",
            status_code=404,
        )

    if require_lgpd_consent and not has_active_consent(
        student=student, consent_type=ConsentType.ENROLLMENT_DATA_USE
    ):
        raise BusinessLogicError(
            code="LGPD_CONSENT_REQUIRED",
            message=(
                "Não é possível matricular o aluno sem o consentimento LGPD para "
                "uso de dados pessoais. Registre o aceite dos termos na ficha do aluno."
            ),
        )

    has_active_enrollment = Enrollment.objects.filter(
        student=student,
        school_class__academic_year=school_class.academic_year,
        status=EnrollmentStatus.ENROLLED,
        deleted_at__isnull=True,
    ).exists()
    if has_active_enrollment:
        raise BusinessLogicError(
            code="DUPLICATE_ENROLLMENT",
            message="Aluno já possui uma matrícula ativa para este ano letivo.",
        )

    current_enrolled_count = Enrollment.objects.filter(
        school_class=school_class,
        status=EnrollmentStatus.ENROLLED,
        deleted_at__isnull=True,
    ).count()
    if current_enrolled_count >= school_class.max_capacity:
        raise BusinessLogicError(
            code="CLASS_CAPACITY_EXCEEDED",
            message=f"Turma atingiu a capacidade máxima de {school_class.max_capacity} alunos.",
        )

    return Enrollment.objects.create(
        student=student,
        school_class=school_class,
        academic_year=school_class.academic_year,
        enrollment_number=enrollment_number or _generate_enrollment_number(school_class),
        status=EnrollmentStatus.ENROLLED,
    )

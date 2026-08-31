"""Auto-cadastro de responsável (DX-SGE-006).

Cria (ou reaproveita) o ``Guardian`` e o ``User`` numa transação atômica.
Dispara a verificação de e-mail — o acesso à vida escolar só é liberado depois.
"""

from __future__ import annotations

from django.db import transaction

from core.exceptions import BusinessLogicError
from core.models import User, UserRole
from core.validators import normalize_cpf
from apps.audit.services.audit_service import log_action
from apps.students.models import Guardian


@transaction.atomic
def self_register_guardian(
    *,
    full_name: str,
    cpf: str,
    email: str,
    password: str,
    phone: str,
    address: str = '',
    occupation: str = '',
) -> dict:
    cpf = normalize_cpf(cpf)
    email = email.strip().lower()

    if User.objects.filter(cpf=cpf).exists():
        raise BusinessLogicError(
            code='CPF_ALREADY_REGISTERED',
            message='Já existe uma conta com este CPF. Use "Esqueci minha senha" ou procure a escola.',
        )
    if User.objects.filter(email__iexact=email).exists():
        raise BusinessLogicError(
            code='EMAIL_ALREADY_REGISTERED',
            message='Já existe uma conta com este e-mail.',
        )

    parts = full_name.split()
    first_name = parts[0] if parts else ''
    last_name = ' '.join(parts[1:])

    user = User.objects.create_user(
        username=cpf,
        email=email,
        password=password,
        cpf=cpf,
        first_name=first_name,
        last_name=last_name,
        role=UserRole.STUDENT_GUARDIAN,
    )

    guardian = Guardian.objects.filter(cpf=cpf, deleted_at__isnull=True).first()
    if guardian is not None:
        if guardian.user_id and guardian.user_id != user.id:
            raise BusinessLogicError(
                code='GUARDIAN_ALREADY_LINKED',
                message='Este CPF já está vinculado a outra conta. Procure a secretaria da escola.',
            )
        guardian.user = user
        guardian.full_name = guardian.full_name or full_name
        guardian.email = guardian.email or email
        guardian.phone = guardian.phone or phone
        guardian.address = guardian.address or address
        guardian.occupation = guardian.occupation or occupation
        guardian.save(
            update_fields=['user', 'full_name', 'email', 'phone', 'address', 'occupation', 'updated_at']
        )
        reused = True
    else:
        guardian = Guardian.objects.create(
            user=user,
            full_name=full_name,
            cpf=cpf,
            phone=phone,
            email=email,
            address=address,
            occupation=occupation,
        )
        reused = False

    from apps.authentication.services.email_verification_service import start_verification

    start_verification(user=user)

    log_action(
        user=user,
        action='GUARDIAN_SELF_REGISTERED',
        resource='guardians',
        resource_id=str(guardian.id),
        details={'reused_guardian': reused},
    )
    return {'user': user, 'guardian': guardian}

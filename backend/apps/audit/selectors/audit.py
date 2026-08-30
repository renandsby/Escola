"""Consulta da trilha de auditoria — só ``sme_admin``, isolada por secretaria."""

from django.db.models import Q

from apps.audit.models import AuditLog
from core.models import UserRole


def get_audit_logs_for_user(*, user):
    if getattr(user, 'role', None) != UserRole.SME_ADMIN:
        return AuditLog.objects.none()

    qs = AuditLog.objects.select_related('user')
    dept_id = getattr(user, 'education_department_id', None)
    if dept_id:
        # ações de usuários da própria secretaria + ações de sistema (sem usuário)
        qs = qs.filter(Q(user__education_department_id=dept_id) | Q(user__isnull=True))
    return qs

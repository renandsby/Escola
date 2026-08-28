from django.db.models import Q

from core.models import User, UserRole


def get_users_for_user(*, user):
    """Usuários visíveis conforme o papel: SME vê a rede, escola vê a unidade,
    demais veem apenas o próprio registro."""
    qs = User.objects.filter(is_active=True)
    if not user.is_authenticated:
        return qs.none()
    if user.role in (UserRole.SME_ADMIN, UserRole.SME_SUPERVISOR):
        return qs.filter(education_department_id=user.education_department_id)
    if user.role in (UserRole.SCHOOL_DIRECTOR, UserRole.SCHOOL_SECRETARY):
        return qs.filter(Q(school_id=user.school_id) | Q(pk=user.pk))
    return qs.filter(pk=user.pk)

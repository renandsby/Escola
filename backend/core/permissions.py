"""Permissões DRF para o RBAC hierárquico SME (6 papéis — Design Doc §5)."""

from rest_framework import permissions

from core.models import UserRole


class RolePermission(permissions.BasePermission):
    """Base: exige autenticação e ``role`` em ``allowed_roles``."""

    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, 'role', None) in self.allowed_roles
        )


# ---------------------------------------------------------------------------
# Papéis individuais
# ---------------------------------------------------------------------------


class IsSMEAdmin(RolePermission):
    """Administrador da SME."""

    allowed_roles = (UserRole.SME_ADMIN,)


class IsSMESupervisor(RolePermission):
    """Supervisor pedagógico da SME."""

    allowed_roles = (UserRole.SME_SUPERVISOR,)


class IsSchoolDirector(RolePermission):
    """Diretor / gestor escolar."""

    allowed_roles = (UserRole.SCHOOL_DIRECTOR,)


class IsSchoolSecretary(RolePermission):
    """Secretário escolar."""

    allowed_roles = (UserRole.SCHOOL_SECRETARY,)


class IsTeacher(RolePermission):
    """Professor."""

    allowed_roles = (UserRole.TEACHER,)


class IsStudentGuardian(RolePermission):
    """Aluno ou responsável."""

    allowed_roles = (UserRole.STUDENT_GUARDIAN,)


# ---------------------------------------------------------------------------
# Grupos de papéis
# ---------------------------------------------------------------------------


class IsSMEStaff(RolePermission):
    """Staff da secretaria: admin ou supervisor."""

    allowed_roles = (UserRole.SME_ADMIN, UserRole.SME_SUPERVISOR)


class IsSchoolStaff(RolePermission):
    """Staff da unidade: diretor ou secretário."""

    allowed_roles = (UserRole.SCHOOL_DIRECTOR, UserRole.SCHOOL_SECRETARY)


# ---------------------------------------------------------------------------
# Permissões compostas / por ação
# ---------------------------------------------------------------------------


class CanManageSchools(permissions.BasePermission):
    """SME admin: escrita; SME staff + escola vinculada: leitura."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return user.role in (
                UserRole.SME_ADMIN,
                UserRole.SME_SUPERVISOR,
                UserRole.SCHOOL_DIRECTOR,
                UserRole.SCHOOL_SECRETARY,
            )
        return user.role == UserRole.SME_ADMIN


class CanEditGrades(permissions.BasePermission):
    """Leitura: autenticado. Escrita: professor ou sme_admin."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user.role in (UserRole.SME_ADMIN, UserRole.TEACHER)


class CanCreateStudent(RolePermission):
    """Quem pode criar alunos no cadastro único."""

    allowed_roles = (
        UserRole.SME_ADMIN,
        UserRole.SCHOOL_DIRECTOR,
        UserRole.SCHOOL_SECRETARY,
    )


class IsSchoolOwner(permissions.BasePermission):
    """
    Object-level: o objeto pertence à mesma escola do usuário
    (``obj.school_id`` ou ``obj.school`` vs ``user.school_id``).
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated and user.school_id):
            return False

        school_id = getattr(obj, 'school_id', None)
        if school_id is not None:
            return school_id == user.school_id

        school = getattr(obj, 'school', None)
        if school is not None:
            return getattr(school, 'pk', school) == user.school_id

        return False


class IsEmailVerified(permissions.BasePermission):
    """Exige autenticação e, para ``student_guardian``, e-mail verificado.

    Papéis de equipe (criados pela SME) passam direto — não têm fluxo de
    autoverificação.
    """

    message = 'Confirme o seu e-mail para acessar as informações escolares.'
    code = 'EMAIL_NOT_VERIFIED'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if getattr(user, 'role', None) != UserRole.STUDENT_GUARDIAN:
            return True
        from apps.authentication.services.email_verification_service import is_verified

        return is_verified(user)


# Aliases de compatibilidade com imports legados
IsAdmin = IsSMEAdmin
IsDirector = IsSchoolDirector
IsSecretary = IsSchoolSecretary
IsGuardian = IsStudentGuardian
IsStudent = IsStudentGuardian
IsCoordinator = IsSMESupervisor

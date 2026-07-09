from rest_framework import permissions
from core.models import UserRole


class IsAdmin(permissions.BasePermission):
    """Apenas administradores."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsDirector(permissions.BasePermission):
    """Apenas diretores."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.DIRECTOR
        )


class IsCoordinator(permissions.BasePermission):
    """Apenas coordenadores."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.COORDINATOR
        )


class IsSecretary(permissions.BasePermission):
    """Apenas secretárias."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.SECRETARY
        )


class IsTeacher(permissions.BasePermission):
    """Apenas professores."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.TEACHER
        )


class IsGuardian(permissions.BasePermission):
    """Apenas responsáveis."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.GUARDIAN
        )


class IsStudent(permissions.BasePermission):
    """Apenas alunos."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.STUDENT
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Admins podem fazer tudo, outros apenas leitura."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsSchoolOwner(permissions.BasePermission):
    """Usuário deve pertencer à mesma escola do objeto."""

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'school'):
            return obj.school == request.user.school
        if hasattr(obj, 'school_id'):
            return obj.school_id == request.user.school_id
        return False


class CanCreateStudent(permissions.BasePermission):
    """Apenas roles que podem criar alunos."""

    def has_permission(self, request, view):
        allowed_roles = [
            UserRole.ADMIN,
            UserRole.DIRECTOR,
            UserRole.COORDINATOR,
            UserRole.SECRETARY,
        ]
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in allowed_roles
        )


class CanEditGrades(permissions.BasePermission):
    """Apenas professores e admin podem editar notas."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)

        allowed_roles = [UserRole.ADMIN, UserRole.TEACHER]
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in allowed_roles
        )


class CanViewAttendance(permissions.BasePermission):
    """Apenas roles que podem visualizar frequência."""

    def has_permission(self, request, view):
        allowed_roles = [
            UserRole.ADMIN,
            UserRole.DIRECTOR,
            UserRole.COORDINATOR,
            UserRole.SECRETARY,
            UserRole.TEACHER,
            UserRole.GUARDIAN,
        ]
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in allowed_roles
        )


class CanAccessGuardianArea(permissions.BasePermission):
    """Apenas responsáveis e alunos acessam a área restrita."""

    def has_permission(self, request, view):
        allowed_roles = [
            UserRole.GUARDIAN,
            UserRole.STUDENT,
        ]
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in allowed_roles
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Usuário pode editar seus próprios dados ou apenas ler dados de outros."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj == request.user

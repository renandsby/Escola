from rest_framework import permissions
from core.models import UserRole


class IsSelfOrAdmin(permissions.BasePermission):
    """Object-level: only the user themself or an SME admin may modify."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        return obj.pk == user.pk or user.role == UserRole.SME_ADMIN

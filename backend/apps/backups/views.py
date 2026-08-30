from rest_framework import filters, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from core.permissions import IsSMEAdmin

from .models import BackupTrigger
from .selectors.backups import get_backups_for_user
from .serializers import BackupSerializer
from .services.backup_service import create_database_backup, ensure_manual_backup_allowed


class BackupViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Histórico e disparo de backups do banco — exclusivo de ``sme_admin``."""

    serializer_class = BackupSerializer
    permission_classes = [permissions.IsAuthenticated, IsSMEAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['backup_type', 'status', 'triggered_by']
    ordering_fields = ['created_at', 'size_mb']
    ordering = ['-created_at']

    def get_queryset(self):
        return get_backups_for_user(user=self.request.user)

    @action(detail=False, methods=['post'])
    def trigger(self, request):
        """Dispara um backup manual imediato (rate-limited a 1/10 min)."""
        ensure_manual_backup_allowed(request.user)
        backup = create_database_backup(
            triggered_by=BackupTrigger.MANUAL, user=request.user
        )
        code = (
            status.HTTP_201_CREATED
            if backup.status == 'COMPLETED'
            else status.HTTP_502_BAD_GATEWAY
        )
        return Response(BackupSerializer(backup).data, status=code)

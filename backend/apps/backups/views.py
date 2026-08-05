from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Backup
from .serializers import BackupSerializer
from core.permissions import IsAdmin


class BackupViewSet(viewsets.ModelViewSet):
    queryset = Backup.objects.filter(is_active=True)
    serializer_class = BackupSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['backup_type', 'status', 'school']
    ordering_fields = ['created_at', 'size_mb']
    ordering = ['-created_at']

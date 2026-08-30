from django.utils import timezone
from rest_framework import filters, mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Notificações do usuário autenticado — leitura, exclusão e marcação."""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['read', 'notification_type']
    ordering_fields = ['created_at', 'read']
    ordering = ['-created_at']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user, is_active=True)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(read=False).count()
        return Response({'unread': count})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(read=False).update(
            read=True, read_at=timezone.now(), updated_at=timezone.now()
        )
        return Response({'marked': updated})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        note = self.get_object()
        if not note.read:
            note.read = True
            note.read_at = timezone.now()
            note.save(update_fields=['read', 'read_at', 'updated_at'])
        return Response(NotificationSerializer(note).data)

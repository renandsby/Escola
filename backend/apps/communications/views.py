from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend

from apps.notifications.services.notification_service import notify_user
from .models import Message
from .serializers import MessageSerializer, MessageCreateSerializer


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['subject', 'body']
    ordering_fields = ['created_at', 'read']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(recipient=user, is_active=True)

    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        notify_user(
            user=message.recipient,
            title='Nova mensagem',
            message=f'{self.request.user.get_full_name() or self.request.user.username}: {message.subject}',
            category='message',
            link='/mensagens',
        )

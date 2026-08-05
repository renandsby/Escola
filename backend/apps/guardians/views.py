from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Guardian
from .serializers import GuardianSerializer, GuardianListSerializer


class GuardianViewSet(viewsets.ModelViewSet):
    queryset = Guardian.objects.filter(is_active=True)
    serializer_class = GuardianSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['school', 'relationship']
    search_fields = ['cpf', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return GuardianListSerializer
        return GuardianSerializer

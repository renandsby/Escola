from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Grade
from .serializers import GradeSerializer, GradeListSerializer


class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.filter(is_active=True)
    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'subject', 'class_obj']
    search_fields = ['student__user__first_name', 'student__user__last_name']
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return GradeListSerializer
        return GradeSerializer

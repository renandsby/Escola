from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Class
from .serializers import ClassSerializer, ClassListSerializer


class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.filter(is_active=True)
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'school', 'year', 'semester', 'grade_level']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'year', 'semester']
    ordering = ['-year', '-semester', 'name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ClassListSerializer
        return ClassSerializer

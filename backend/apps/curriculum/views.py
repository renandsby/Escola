from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Curriculum
from .serializers import CurriculumSerializer


class CurriculumViewSet(viewsets.ModelViewSet):
    queryset = Curriculum.objects.filter(is_active=True)
    serializer_class = CurriculumSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['school', 'grade_level', 'year']
    search_fields = ['name']
    ordering_fields = ['year', 'grade_level']
    ordering = ['-year', 'grade_level']

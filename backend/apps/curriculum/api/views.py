from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from apps.curriculum.models import CurriculumMatrix, CurriculumMatrixItem, Subject
from apps.curriculum.selectors.matrices import (
    get_curriculum_matrices_for_user,
    get_curriculum_matrix_items_for_user,
)
from apps.curriculum.selectors.subjects import get_subjects_for_user

from .serializers import (
    CurriculumMatrixItemSerializer,
    CurriculumMatrixListSerializer,
    CurriculumMatrixSerializer,
    SubjectListSerializer,
    SubjectSerializer,
)


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.filter(is_active=True)
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['education_department', 'area_of_knowledge', 'is_active']
    search_fields = ['name', 'bncc_code', 'area_of_knowledge']
    ordering_fields = ['name', 'bncc_code', 'area_of_knowledge']
    ordering = ['name']

    def get_queryset(self):
        return get_subjects_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return SubjectListSerializer
        return SubjectSerializer


class CurriculumMatrixViewSet(viewsets.ModelViewSet):
    queryset = CurriculumMatrix.objects.filter(is_active=True)
    serializer_class = CurriculumMatrixSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['education_department', 'education_stage', 'is_active']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return get_curriculum_matrices_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return CurriculumMatrixListSerializer
        return CurriculumMatrixSerializer


class CurriculumMatrixItemViewSet(viewsets.ModelViewSet):
    queryset = CurriculumMatrixItem.objects.filter(is_active=True)
    serializer_class = CurriculumMatrixItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['curriculum_matrix', 'subject']
    search_fields = ['subject__name', 'curriculum_matrix__name']
    ordering_fields = ['weekly_hours', 'annual_hours']
    ordering = ['curriculum_matrix', 'subject__name']

    def get_queryset(self):
        return get_curriculum_matrix_items_for_user(user=self.request.user)

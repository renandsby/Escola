from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.governance.models import AcademicPeriod, AcademicYear, EducationDepartment, EducationStage
from apps.governance.selectors.reference_data import (
    get_academic_periods_for_user,
    get_academic_years_for_user,
    get_education_departments_for_user,
    get_education_stages,
)
from apps.schools.models import School
from apps.students.models import Enrollment, EnrollmentStatus, Student
from core.permissions import IsSMEAdmin, IsSMEStaff

from .serializers import (
    AcademicPeriodListSerializer,
    AcademicPeriodSerializer,
    AcademicYearListSerializer,
    AcademicYearSerializer,
    EducationDepartmentListSerializer,
    EducationDepartmentSerializer,
    EducationStageSerializer,
)


class EducationDepartmentViewSet(viewsets.ModelViewSet):
    queryset = EducationDepartment.objects.filter(is_active=True)
    serializer_class = EducationDepartmentSerializer
    permission_classes = [IsSMEStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['municipality_name', 'ibge_code', 'secretary_name']
    ordering_fields = ['municipality_name', 'created_at']
    ordering = ['municipality_name']

    def get_queryset(self):
        return get_education_departments_for_user(user=self.request.user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsSMEAdmin()]
        return [IsSMEStaff()]

    def get_serializer_class(self):
        if self.action == 'list':
            return EducationDepartmentListSerializer
        return EducationDepartmentSerializer

    @action(detail=True, methods=['get'])
    def indicators(self, request, pk=None):
        department = self.get_object()
        schools = School.objects.filter(
            education_department=department,
            deleted_at__isnull=True,
        )
        students = Student.objects.filter(
            education_department=department,
            deleted_at__isnull=True,
        )
        active_enrollments = Enrollment.objects.filter(
            student__education_department=department,
            status=EnrollmentStatus.ENROLLED,
            deleted_at__isnull=True,
        )
        return Response(
            {
                'schools_count': schools.count(),
                'students_count': students.count(),
                'active_enrollments_count': active_enrollments.count(),
                'schools_by_type': list(
                    schools.values('school_type').annotate(count=Count('id')).order_by('school_type')
                ),
            }
        )


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.filter(is_active=True).select_related('education_department')
    serializer_class = AcademicYearSerializer
    permission_classes = [IsSMEStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['education_department', 'status', 'year', 'is_active']
    search_fields = ['year']
    ordering_fields = ['year', 'start_date']
    ordering = ['-year']

    def get_queryset(self):
        return get_academic_years_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return AcademicYearListSerializer
        return AcademicYearSerializer


class AcademicPeriodViewSet(viewsets.ModelViewSet):
    queryset = AcademicPeriod.objects.filter(is_active=True).select_related('academic_year')
    serializer_class = AcademicPeriodSerializer
    permission_classes = [IsSMEStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['academic_year', 'period_number', 'is_active']
    search_fields = ['name']
    ordering_fields = ['period_number', 'start_date']
    ordering = ['academic_year', 'period_number']

    def get_queryset(self):
        return get_academic_periods_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return AcademicPeriodListSerializer
        return AcademicPeriodSerializer


class EducationStageViewSet(viewsets.ModelViewSet):
    queryset = EducationStage.objects.filter(is_active=True)
    serializer_class = EducationStageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['stage_type', 'evaluation_type', 'is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code']
    ordering = ['name']

    def get_queryset(self):
        return get_education_stages()

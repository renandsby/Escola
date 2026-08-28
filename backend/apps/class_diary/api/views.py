from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from core.permissions import CanEditGrades

from apps.class_diary.models import Attendance, DescriptiveEvaluation, DiaryEntry, Grade, SchoolHistory
from apps.class_diary.selectors.attendance import get_attendance_for_user
from apps.class_diary.selectors.diary import get_diary_entries_for_user
from apps.class_diary.selectors.evaluations import get_descriptive_evaluations_for_user
from apps.class_diary.selectors.grades import get_grades_for_user
from apps.class_diary.services.attendance_batch_service import batch_upsert_attendance
from apps.class_diary.services.grade_batch_service import batch_upsert_grades

from .serializers import (
    AttendanceBatchUpsertItemSerializer,
    AttendanceListSerializer,
    AttendanceSerializer,
    DescriptiveEvaluationListSerializer,
    DescriptiveEvaluationSerializer,
    DiaryEntrySerializer,
    GradeBatchUpsertItemSerializer,
    GradeListSerializer,
    GradeSerializer,
    SchoolHistorySerializer,
)


# ---------------------------------------------------------------------------
# Diary
# ---------------------------------------------------------------------------


class DiaryEntryViewSet(viewsets.ModelViewSet):
    queryset = DiaryEntry.objects.filter(is_active=True).select_related(
        'school_class',
        'subject',
        'teacher',
        'teacher__user',
    )
    serializer_class = DiaryEntrySerializer
    permission_classes = [permissions.IsAuthenticated, CanEditGrades]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['school_class', 'subject', 'teacher', 'date']
    search_fields = ['content', 'homework', 'observations']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        return get_diary_entries_for_user(user=self.request.user)


# ---------------------------------------------------------------------------
# Grade
# ---------------------------------------------------------------------------


class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.filter(is_active=True).select_related(
        'enrollment',
        'enrollment__student',
        'subject',
        'academic_period',
        'teacher',
    )
    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated, CanEditGrades]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'enrollment',
        'subject',
        'academic_period',
        'teacher',
        'assessment_type',
    ]
    search_fields = [
        'enrollment__student__full_name',
        'enrollment__enrollment_number',
        'subject__name',
    ]
    ordering_fields = ['created_at', 'score']
    ordering = ['-created_at']

    def get_queryset(self):
        student = self.request.query_params.get('student')
        enrollment = self.request.query_params.get('enrollment')
        return get_grades_for_user(
            user=self.request.user,
            student_id=student,
            enrollment_id=enrollment,
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return GradeListSerializer
        return GradeSerializer

    @action(detail=False, methods=['post'], url_path='batch-upsert')
    def batch_upsert(self, request):
        items = request.data if isinstance(request.data, list) else request.data.get('items', [])
        serializer = GradeBatchUpsertItemSerializer(data=items, many=True)
        serializer.is_valid(raise_exception=True)

        results = batch_upsert_grades(items=serializer.validated_data, actor_user=request.user)

        return Response({'results': results}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.filter(is_active=True).select_related(
        'enrollment',
        'enrollment__student',
        'school_class',
        'subject',
    )
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated, CanEditGrades]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'status',
        'date',
        'school_class',
        'subject',
        'enrollment',
    ]
    search_fields = [
        'enrollment__student__full_name',
        'enrollment__enrollment_number',
    ]
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        student = self.request.query_params.get('student')
        enrollment = self.request.query_params.get('enrollment')
        return get_attendance_for_user(
            user=self.request.user,
            student_id=student,
            enrollment_id=enrollment,
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return AttendanceListSerializer
        return AttendanceSerializer

    @action(detail=False, methods=['post'], url_path='batch-upsert')
    def batch_upsert(self, request):
        items = request.data if isinstance(request.data, list) else request.data.get('items', [])
        serializer = AttendanceBatchUpsertItemSerializer(data=items, many=True)
        serializer.is_valid(raise_exception=True)

        results = batch_upsert_attendance(items=serializer.validated_data)

        return Response({'results': results}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Descriptive Evaluation
# ---------------------------------------------------------------------------


class DescriptiveEvaluationViewSet(viewsets.ModelViewSet):
    queryset = DescriptiveEvaluation.objects.filter(is_active=True).select_related(
        'enrollment',
        'enrollment__student',
        'academic_period',
        'teacher',
    )
    serializer_class = DescriptiveEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated, CanEditGrades]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['enrollment', 'academic_period', 'teacher']
    search_fields = [
        'enrollment__student__full_name',
        'enrollment__enrollment_number',
        'development_report',
    ]
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        student = self.request.query_params.get('student')
        enrollment = self.request.query_params.get('enrollment')
        return get_descriptive_evaluations_for_user(
            user=self.request.user,
            student_id=student,
            enrollment_id=enrollment,
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return DescriptiveEvaluationListSerializer
        return DescriptiveEvaluationSerializer


# ---------------------------------------------------------------------------
# School History (legado / não escopado — ver nota no plano de migração)
# ---------------------------------------------------------------------------


class SchoolHistoryViewSet(viewsets.ModelViewSet):
    queryset = SchoolHistory.objects.filter(is_active=True)
    serializer_class = SchoolHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['final_status']
    search_fields = ['student__user__first_name', 'student__user__last_name']
    ordering_fields = ['overall_average', 'attendance_percentage']
    ordering = ['-overall_average']

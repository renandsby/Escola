from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.class_diary.models import Attendance, DescriptiveEvaluation, Grade
from apps.class_diary.api.serializers import (
    AttendanceListSerializer,
    DescriptiveEvaluationListSerializer,
    GradeListSerializer,
)
from core.permissions import CanCreateStudent, IsSMEStaff, IsSchoolStaff

from apps.students.filters import StudentFilterSet
from apps.students.models import Enrollment, Guardian, Student, StudentGuardian, TransferRequest
from apps.students.selectors.enrollments import get_enrollments_for_user, get_transfer_requests_for_user
from apps.students.selectors.guardians import get_guardians_for_user, get_student_guardian_links_for_user
from apps.students.selectors.students import get_students_for_user
from apps.students.services.enrollment_service import enroll_student_in_class
from apps.students.services.transfer_service import (
    accept_transfer,
    authorize_transfer,
    reject_transfer,
)

from .serializers import (
    EnrollmentCreateInputSerializer,
    EnrollmentListSerializer,
    EnrollmentSerializer,
    GuardianListSerializer,
    GuardianSerializer,
    StudentGuardianSerializer,
    StudentListSerializer,
    StudentSerializer,
    TransferRequestListSerializer,
    TransferRequestSerializer,
)


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.filter(deleted_at__isnull=True).select_related(
        'user',
        'education_department',
    )
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StudentFilterSet
    search_fields = [
        'unique_municipal_id',
        'full_name',
        'social_name',
        'cpf',
        'inep_id',
        'mother_name',
    ]
    ordering_fields = ['full_name', 'unique_municipal_id', 'created_at']
    ordering = ['full_name']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [CanCreateStudent()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return get_students_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return StudentListSerializer
        return StudentSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='academic-history')
    def academic_history(self, request, pk=None):
        student = self.get_object()
        enrollments = Enrollment.objects.filter(
            student=student,
            deleted_at__isnull=True,
        ).select_related('school_class', 'school_class__school')

        grades = Grade.objects.filter(enrollment__student=student).select_related(
            'subject',
            'academic_period',
            'enrollment',
        )
        attendances = Attendance.objects.filter(enrollment__student=student).select_related(
            'school_class',
            'subject',
        )
        evaluations = DescriptiveEvaluation.objects.filter(
            enrollment__student=student,
        ).select_related('academic_period', 'teacher')

        return Response(
            {
                'student': StudentSerializer(student).data,
                'enrollments': EnrollmentListSerializer(enrollments, many=True).data,
                'grades': GradeListSerializer(grades, many=True).data,
                'attendances': AttendanceListSerializer(attendances, many=True).data,
                'descriptive_evaluations': DescriptiveEvaluationListSerializer(
                    evaluations,
                    many=True,
                ).data,
            }
        )


# ---------------------------------------------------------------------------
# Guardian
# ---------------------------------------------------------------------------


class GuardianViewSet(viewsets.ModelViewSet):
    queryset = Guardian.objects.filter(deleted_at__isnull=True).select_related('user')
    serializer_class = GuardianSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['full_name', 'cpf', 'phone', 'email']
    ordering_fields = ['full_name', 'created_at']
    ordering = ['full_name']

    def get_queryset(self):
        return get_guardians_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return GuardianListSerializer
        return GuardianSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().destroy(request, *args, **kwargs)


class StudentGuardianViewSet(viewsets.ModelViewSet):
    queryset = StudentGuardian.objects.select_related('student', 'guardian')
    serializer_class = StudentGuardianSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'guardian', 'kinship_type', 'is_emergency_contact']
    search_fields = ['student__full_name', 'guardian__full_name', 'guardian__cpf']
    ordering_fields = ['kinship_type']
    ordering = ['student__full_name']

    def get_queryset(self):
        return get_student_guardian_links_for_user(user=self.request.user)


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.filter(deleted_at__isnull=True).select_related(
        'student',
        'school_class',
        'school_class__school',
    )
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'status',
        'school_class',
        'student',
        'school_class__school',
    ]
    search_fields = [
        'enrollment_number',
        'student__full_name',
        'student__unique_municipal_id',
    ]
    ordering_fields = ['enrollment_date', 'created_at', 'enrollment_number']
    ordering = ['-enrollment_date']

    def get_queryset(self):
        return get_enrollments_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return EnrollmentListSerializer
        return EnrollmentSerializer

    def create(self, request, *args, **kwargs):
        input_serializer = EnrollmentCreateInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        enrollment = enroll_student_in_class(
            student_id=input_serializer.validated_data['student'],
            school_class_id=input_serializer.validated_data['school_class'],
            actor_user=request.user,
            enrollment_number=input_serializer.validated_data.get('enrollment_number') or None,
        )

        return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().destroy(request, *args, **kwargs)


class TransferRequestViewSet(viewsets.ModelViewSet):
    queryset = TransferRequest.objects.filter(deleted_at__isnull=True).select_related(
        'student',
        'origin_school',
        'destination_school',
        'academic_year',
    )
    serializer_class = TransferRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'status',
        'origin_school',
        'destination_school',
        'academic_year',
        'student',
    ]
    search_fields = ['student__full_name', 'student__unique_municipal_id', 'reason']
    ordering_fields = ['requested_at', 'status']
    ordering = ['-requested_at']

    def get_queryset(self):
        return get_transfer_requests_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return TransferRequestListSerializer
        return TransferRequestSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsSMEStaff])
    def authorize(self, request, pk=None):
        transfer = self.get_object()
        transfer = authorize_transfer(
            transfer_id=transfer.id,
            destination_school_id=request.data.get('destination_school'),
            actor_user=request.user,
        )
        return Response(TransferRequestSerializer(transfer).data)

    @action(
        detail=True,
        methods=['patch'],
        permission_classes=[permissions.IsAuthenticated, IsSchoolStaff | IsSMEStaff],
    )
    def accept(self, request, pk=None):
        """Aceite pela escola de destino (ou SME): encerra a matrícula de origem
        e, com ``destination_class_id``, enturma o aluno na unidade de destino."""
        transfer = self.get_object()
        transfer = accept_transfer(
            transfer_id=transfer.id,
            destination_class_id=request.data.get('destination_class_id'),
            actor_user=request.user,
        )
        return Response(TransferRequestSerializer(transfer).data)

    @action(
        detail=True,
        methods=['patch'],
        permission_classes=[permissions.IsAuthenticated, IsSchoolStaff | IsSMEStaff],
    )
    def reject(self, request, pk=None):
        transfer = self.get_object()
        transfer = reject_transfer(
            transfer_id=transfer.id,
            actor_user=request.user,
            reason=request.data.get('reason', ''),
        )
        return Response(TransferRequestSerializer(transfer).data)

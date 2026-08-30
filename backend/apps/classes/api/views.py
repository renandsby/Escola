from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.response import Response

from core.permissions import IsSchoolStaff, IsSMEAdmin, IsSMEStaff

from apps.classes.models import Classroom, SchoolClass, TeacherAllocation, TeacherProfile
from apps.classes.selectors.classrooms import get_classrooms_for_user
from apps.classes.selectors.school_classes import get_school_classes_for_user
from apps.classes.selectors.teachers import (
    get_teacher_allocations_for_user,
    get_teacher_profiles_for_user,
)
from apps.classes.services.allocation_service import allocate_teacher

from .serializers import (
    ClassroomSerializer,
    SchoolClassListSerializer,
    SchoolClassSerializer,
    TeacherAllocationCreateInputSerializer,
    TeacherAllocationSerializer,
    TeacherProfileListSerializer,
    TeacherProfileSerializer,
)


class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.filter(deleted_at__isnull=True).select_related(
        'school',
        'academic_year',
        'curriculum_matrix',
        'classroom',
    )
    serializer_class = SchoolClassSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['school', 'academic_year', 'curriculum_matrix', 'shift', 'is_active']
    search_fields = ['name', 'inep_class_code', 'room_number']
    ordering_fields = ['name', 'created_at']
    ordering = ['school', 'name']

    def get_queryset(self):
        return get_school_classes_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return SchoolClassListSerializer
        return SchoolClassSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().destroy(request, *args, **kwargs)


ClassViewSet = SchoolClassViewSet


class ClassroomViewSet(viewsets.ModelViewSet):
    queryset = Classroom.objects.filter(is_active=True)
    serializer_class = ClassroomSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['school', 'floor', 'building']
    search_fields = ['number']
    ordering_fields = ['number', 'capacity']
    ordering = ['number']

    def get_queryset(self):
        return get_classrooms_for_user(user=self.request.user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), (IsSMEStaff | IsSchoolStaff)()]
        return [permissions.IsAuthenticated()]


class TeacherProfileViewSet(viewsets.ModelViewSet):
    queryset = TeacherProfile.objects.filter(deleted_at__isnull=True).select_related(
        'user',
        'education_department',
    )
    serializer_class = TeacherProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['education_department', 'is_active']
    search_fields = [
        'registration_number',
        'cpf',
        'user__first_name',
        'user__last_name',
        'formation_area',
    ]
    ordering_fields = ['registration_number', 'created_at']
    ordering = ['registration_number']

    def get_queryset(self):
        return get_teacher_profiles_for_user(user=self.request.user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsSMEAdmin()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return TeacherProfileListSerializer
        return TeacherProfileSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().destroy(request, *args, **kwargs)


class TeacherAllocationViewSet(viewsets.ModelViewSet):
    queryset = TeacherAllocation.objects.select_related(
        'teacher_profile',
        'teacher_profile__user',
        'school_class',
        'subject',
    )
    serializer_class = TeacherAllocationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSMEStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['teacher_profile', 'school_class', 'subject', 'is_regent']
    search_fields = [
        'teacher_profile__user__first_name',
        'teacher_profile__user__last_name',
        'school_class__name',
    ]
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return get_teacher_allocations_for_user(user=self.request.user)

    def create(self, request, *args, **kwargs):
        input_serializer = TeacherAllocationCreateInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        allocation = allocate_teacher(
            teacher_profile_id=input_serializer.validated_data['teacher_profile'],
            school_class_id=input_serializer.validated_data['school_class'],
            subject_id=input_serializer.validated_data.get('subject'),
            is_regent=input_serializer.validated_data.get('is_regent', False),
            actor_user=request.user,
        )

        return Response(
            TeacherAllocationSerializer(allocation).data,
            status=status.HTTP_201_CREATED,
        )


TeacherViewSet = TeacherProfileViewSet

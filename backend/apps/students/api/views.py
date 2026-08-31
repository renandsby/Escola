from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend

from apps.class_diary.models import Attendance, DescriptiveEvaluation, Grade
from apps.governance.models import ConsentType
from apps.governance.services.privacy_service import register_student_consent
from apps.class_diary.api.serializers import (
    AttendanceListSerializer,
    DescriptiveEvaluationListSerializer,
    GradeListSerializer,
)
from core.exceptions import BusinessLogicError
from core.middleware import AuditMiddleware
from core.permissions import CanCreateStudent, IsSMEStaff, IsSchoolStaff
from core.throttling import FindStudentThrottle, GuardianRegisterThrottle

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
    GuardianSelfRegisterSerializer,
    GuardianSerializer,
    LinkByCodeInputSerializer,
    LinkCodeInputSerializer,
    LinkRequestInputSerializer,
    LinkReviewInputSerializer,
    StudentGuardianSerializer,
    StudentListSerializer,
    StudentSerializer,
    TransferRequestListSerializer,
    TransferRequestSerializer,
)


def _client_ip(request):
    return AuditMiddleware.get_client_ip(request)


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

    def create(self, request, *args, **kwargs):
        """Cria o aluno exigindo o aceite LGPD (``lgpd_consent``) e registra o
        ``ConsentRecord`` obrigatório de uso de dados para matrícula."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lgpd_consent = request.data.get('lgpd_consent')
        if lgpd_consent in (None, '', False, 'false', 'False', 0, '0'):
            raise BusinessLogicError(
                code='LGPD_CONSENT_REQUIRED',
                message=(
                    'O aceite dos termos de uso de dados pessoais (LGPD) é '
                    'obrigatório para cadastrar o aluno.'
                ),
            )

        student = serializer.save()

        register_student_consent(
            student=student,
            consent_type=ConsentType.ENROLLMENT_DATA_USE,
            granted=True,
            user=request.user,
            ip_address=_client_ip(request),
        )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().destroy(request, *args, **kwargs)

    @action(
        detail=False,
        methods=['get'],
        url_path='find-by-cpf',
        throttle_classes=[FindStudentThrottle],
    )
    def find_by_cpf(self, request):
        """Diz **apenas** se existe um aluno com o CPF informado.

        Não devolve nenhum dado do aluno — a vinculação usa
        ``guardians/link-requests/`` (prova de parentesco) ou
        ``guardians/link-by-code/``.
        """
        from core.validators import normalize_cpf

        cpf = normalize_cpf(request.query_params.get('cpf', '')) or ''
        if len(cpf) != 11 or not cpf.isdigit():
            return Response(
                {'error': 'Informe um CPF válido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        exists = Student.objects.filter(cpf=cpf, deleted_at__isnull=True).exists()
        return Response({'found': exists})

    @action(
        detail=True,
        methods=['get', 'post'],
        url_path='link-codes',
        permission_classes=[permissions.IsAuthenticated, IsSMEStaff | IsSchoolStaff],
    )
    def link_codes(self, request, pk=None):
        """GET: histórico de códigos do aluno. POST: gera um novo código
        (exibido apenas nesta resposta)."""
        from apps.students.models import GuardianLinkCode
        from apps.students.services.guardian_link_service import generate_link_code

        student = self.get_object()  # já passa pelo escopo RBAC
        if request.method == 'POST':
            payload = LinkCodeInputSerializer(data=request.data)
            payload.is_valid(raise_exception=True)
            raw = generate_link_code(
                student_id=student.id,
                created_by=request.user,
                kinship_hint=payload.validated_data.get('kinship_hint', ''),
                ttl_hours=payload.validated_data.get('ttl_hours', 72),
            )
            code = GuardianLinkCode.objects.filter(student=student).order_by('-created_at').first()
            return Response(
                {'code': raw, 'expires_at': code.expires_at},
                status=status.HTTP_201_CREATED,
            )

        codes = GuardianLinkCode.objects.filter(
            student=student, deleted_at__isnull=True
        ).order_by('-created_at')
        return Response([
            {
                'id': str(c.id),
                'created_at': c.created_at,
                'expires_at': c.expires_at,
                'used': c.used,
                'used_at': c.used_at,
            }
            for c in codes
        ])

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

    @action(
        detail=False,
        methods=['post'],
        url_path='self-register',
        url_name='self-register',
        permission_classes=[AllowAny],
        authentication_classes=[],
        throttle_classes=[GuardianRegisterThrottle],
    )
    def self_register(self, request):
        """Auto-cadastro público de responsável (DX-SGE-006)."""
        from apps.authentication.api.serializers import build_jwt_payload
        from apps.students.services.guardian_service import self_register_guardian
        from core.captcha import verify_captcha

        serializer = GuardianSelfRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        verify_captcha(data.pop('captcha_token', ''), _client_ip(request))

        result = self_register_guardian(**data)
        user, guardian = result['user'], result['guardian']

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                **build_jwt_payload(user, refresh),
                'guardian': GuardianSerializer(guardian).data,
                'email_verification_required': True,
            },
            status=status.HTTP_201_CREATED,
        )


class StudentGuardianViewSet(viewsets.ModelViewSet):
    queryset = StudentGuardian.objects.select_related('student', 'guardian')
    serializer_class = StudentGuardianSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'guardian', 'kinship_type', 'is_emergency_contact', 'status']
    search_fields = ['student__full_name', 'guardian__full_name', 'guardian__cpf']
    ordering_fields = ['kinship_type']
    ordering = ['student__full_name']

    def get_queryset(self):
        return get_student_guardian_links_for_user(user=self.request.user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), (IsSMEStaff | IsSchoolStaff)()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        from django.utils import timezone

        serializer.save(
            status='CONFIRMED',
            verification_method='STAFF_CREATED',
            confirmed_by=self.request.user,
            confirmed_at=timezone.now(),
        )


class GuardianLinkRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """Solicitações de vínculo (DX-SGE-006, caminho A).

    - Responsável: cria via ``request`` e lista as próprias.
    - Equipe: vê a fila da própria escola/SME e aprova/recusa via ``review``.
    """

    serializer_class = StudentGuardianSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status']
    ordering = ['-confirmed_at', 'student__full_name']

    def get_queryset(self):
        user = self.request.user
        base = StudentGuardian.objects.select_related(
            'student', 'guardian', 'requested_by'
        ).filter(verification_method__in=['SCHOOL_APPROVAL', 'LINK_CODE'])
        if getattr(user, 'role', None) == 'student_guardian':
            return base.filter(guardian__user=user)
        from apps.students.services.guardian_link_service import _scoped_students

        return base.filter(student__in=_scoped_students(user))

    @action(
        detail=False,
        methods=['post'],
        url_path='request',
        throttle_classes=[FindStudentThrottle],
    )
    def request_link(self, request):
        from apps.students.services.guardian_link_service import request_link

        payload = LinkRequestInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        link = request_link(user=request.user, **payload.validated_data)
        return Response(StudentGuardianSerializer(link).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        from apps.students.services.guardian_link_service import review_link

        payload = LinkReviewInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        link = review_link(
            link_id=pk,
            decision=payload.validated_data['decision'],
            actor_user=request.user,
            note=payload.validated_data.get('note', ''),
        )
        return Response(StudentGuardianSerializer(link).data)


class GuardianLinkByCodeView(APIView):
    """POST /api/v1/guardians/link-by-code/ (DX-SGE-006, caminho B)."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [FindStudentThrottle]

    def post(self, request):
        from apps.students.services.guardian_link_service import redeem_link_code

        payload = LinkByCodeInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        link = redeem_link_code(
            user=request.user,
            student_cpf=payload.validated_data['student_cpf'],
            code=payload.validated_data['code'],
        )
        return Response(StudentGuardianSerializer(link).data, status=status.HTTP_201_CREATED)


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

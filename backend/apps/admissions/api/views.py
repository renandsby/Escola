from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.middleware import AuditMiddleware
from core.permissions import IsSMEStaff
from apps.governance.models import AcademicYear
from apps.admissions.selectors.admissions import (
    get_cycles_for_user,
    get_enrollment_requests_for_user,
    get_evidence_queue_for_user,
    get_renewals_for_user,
)
from apps.admissions.services import (
    cycle_service,
    enrollment_request_service,
    evidence_service,
    renewal_service,
)

from .serializers import (
    AdmissionCycleSerializer,
    CycleCreateInputSerializer,
    EnrollmentRequestSerializer,
    EvidenceInputSerializer,
    EvidenceVerifyInputSerializer,
    PreferencesInputSerializer,
    PriorityEvidenceSerializer,
    RenewalMaterializeInputSerializer,
    RenewalRequestSerializer,
    RenewalSubmitInputSerializer,
    RequestCreateInputSerializer,
    SubmitInputSerializer,
)


def _ip(request):
    return AuditMiddleware.get_client_ip(request)


class AdmissionCycleViewSet(viewsets.ModelViewSet):
    serializer_class = AdmissionCycleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'target_academic_year']

    def get_queryset(self):
        return get_cycles_for_user(user=self.request.user)

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSMEStaff()]

    def create(self, request, *args, **kwargs):
        payload = CycleCreateInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        year = AcademicYear.objects.filter(
            id=data['target_academic_year'],
            education_department_id=request.user.education_department_id,
        ).first()
        if year is None:
            return Response(
                {'error': 'Ano letivo inválido para a sua secretaria.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cycle = cycle_service.create_cycle(
            education_department=year.education_department,
            target_academic_year=year,
            name=data['name'],
            windows={
                'renewal_opens_at': data['renewal_opens_at'],
                'renewal_closes_at': data['renewal_closes_at'],
                'new_request_opens_at': data['new_request_opens_at'],
                'new_request_closes_at': data['new_request_closes_at'],
            },
            actor_user=request.user,
        )
        return Response(AdmissionCycleSerializer(cycle).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='advance-status')
    def advance_status(self, request, pk=None):
        cycle = cycle_service.advance_status(cycle_id=pk, actor_user=request.user)
        return Response(AdmissionCycleSerializer(cycle).data)

    @action(detail=True, methods=['post'], url_path='open-renewals')
    def open_renewals(self, request, pk=None):
        result = renewal_service.open_renewal_invites(cycle_id=pk, actor_user=request.user)
        return Response(result, status=status.HTTP_202_ACCEPTED)


class RenewalRequestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RenewalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['cycle', 'outcome', 'student']

    def get_queryset(self):
        return get_renewals_for_user(user=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        payload = RenewalSubmitInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        renewal = renewal_service.submit_renewal(
            renewal_id=pk, user=request.user, **payload.validated_data
        )
        return Response(RenewalRequestSerializer(renewal).data)

    @action(detail=True, methods=['post'])
    def materialize(self, request, pk=None):
        payload = RenewalMaterializeInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        enrollment = renewal_service.materialize_renewal(
            renewal_id=pk,
            school_class_id=payload.validated_data['school_class'],
            actor_user=request.user,
        )
        return Response({'enrollment_id': str(enrollment.id)}, status=status.HTTP_201_CREATED)


class EnrollmentRequestViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['cycle', 'status', 'origin']

    def get_queryset(self):
        return get_enrollment_requests_for_user(user=self.request.user)

    def create(self, request, *args, **kwargs):
        payload = RequestCreateInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        req = enrollment_request_service.create_request(
            user=request.user, cycle_id=payload.validated_data.pop('cycle'), **payload.validated_data
        )
        return Response(EnrollmentRequestSerializer(req).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'DRAFT':
            return Response(
                {'error': 'Só rascunhos podem ser removidos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def preferences(self, request, pk=None):
        payload = PreferencesInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        req = enrollment_request_service.set_preferences(
            request_id=pk, user=request.user, school_ids=payload.validated_data['schools']
        )
        return Response(EnrollmentRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def evidence(self, request, pk=None):
        payload = EvidenceInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        ev = enrollment_request_service.attach_evidence(
            request_id=pk,
            user=request.user,
            kind=payload.validated_data['kind'],
            uploaded_file=payload.validated_data['file'],
            declared_school_id=payload.validated_data.get('declared_school'),
        )
        return Response(PriorityEvidenceSerializer(ev).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        payload = SubmitInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        req = enrollment_request_service.submit_request(
            request_id=pk,
            user=request.user,
            lgpd_consent=payload.validated_data['lgpd_consent'],
            client_ip=_ip(request),
        )
        return Response(EnrollmentRequestSerializer(req).data)


class PriorityEvidenceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PriorityEvidenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'kind', 'request']

    def get_queryset(self):
        return get_evidence_queue_for_user(user=self.request.user)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        payload = EvidenceVerifyInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        ev = evidence_service.verify_evidence(
            evidence_id=pk,
            decision=payload.validated_data['decision'],
            actor_user=request.user,
            note=payload.validated_data.get('note', ''),
        )
        return Response(PriorityEvidenceSerializer(ev).data)

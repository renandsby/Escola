from rest_framework import filters, permissions, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.audit.services.audit_service import log_action
from apps.documents.models import Document
from apps.documents.selectors.documents import get_documents_for_user
from apps.documents.services.document_service import upload_document
from .serializers import DocumentSerializer, DocumentUploadSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.filter(is_active=True)
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['document_type', 'student']
    search_fields = ['file_name', 'description']
    ordering_fields = ['created_at', 'expiration_date']
    ordering = ['-created_at']

    def get_queryset(self):
        return get_documents_for_user(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        document = upload_document(
            student_id=data['student'].id,
            document_type=data['document_type'],
            uploaded_file=data['file'],
            description=data.get('description', ''),
            expiration_date=data.get('expiration_date'),
            actor_user=request.user,
        )
        log_action(
            user=request.user,
            action='DOCUMENT_UPLOADED',
            resource='documents',
            resource_id=str(document.id),
            details={'student': str(document.student_id), 'type': document.document_type},
        )
        return Response(DocumentSerializer(document).data, status=201)

from rest_framework import serializers

from apps.students.models import Student
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name', read_only=True
    )
    document_type_display = serializers.CharField(
        source='get_document_type_display', read_only=True
    )

    class Meta:
        model = Document
        fields = [
            'id', 'student', 'student_name', 'document_type', 'document_type_display',
            'file', 'file_name', 'description', 'expiration_date', 'uploaded_by',
            'uploaded_by_name', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'file_name', 'uploaded_by', 'created_at', 'updated_at']


class DocumentUploadSerializer(serializers.Serializer):
    """Payload multipart do upload — a validação de conteúdo fica no service."""

    student = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.filter(deleted_at__isnull=True)
    )
    document_type = serializers.ChoiceField(choices=Document.DOCUMENT_TYPES)
    file = serializers.FileField()
    description = serializers.CharField(required=False, allow_blank=True)
    expiration_date = serializers.DateField(required=False, allow_null=True)

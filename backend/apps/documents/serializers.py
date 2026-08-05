from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'student', 'student_name', 'document_type', 'file',
            'file_name', 'description', 'expiration_date', 'uploaded_by',
            'uploaded_by_name', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

from rest_framework import serializers
from .models import StudentCard


class StudentCardSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)

    class Meta:
        model = StudentCard
        fields = [
            'id', 'student', 'student_name', 'card_number',
            'issue_date', 'expiration_date', 'qr_code_data',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'issue_date', 'qr_code_data', 'created_at', 'updated_at']

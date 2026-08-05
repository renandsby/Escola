from rest_framework import serializers
from .models import SchoolHistory


class SchoolHistorySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)

    class Meta:
        model = SchoolHistory
        fields = [
            'id', 'student', 'student_name', 'total_classes',
            'absences', 'attendance_percentage', 'overall_average',
            'final_status', 'last_updated', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_updated', 'created_at', 'updated_at']

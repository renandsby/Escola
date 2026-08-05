from rest_framework import serializers
from .models import Teacher


class TeacherSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Teacher
        fields = [
            'id', 'user', 'user_name', 'user_email', 'school',
            'registration_number', 'cpf', 'birth_date',
            'academic_degree', 'specialization', 'hiring_date',
            'employment_status', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'hiring_date', 'created_at', 'updated_at']


class TeacherListSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = Teacher
        fields = ['id', 'registration_number', 'user_name', 'employment_status']

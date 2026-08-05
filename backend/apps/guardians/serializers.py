from rest_framework import serializers
from .models import Guardian


class GuardianSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    students_count = serializers.SerializerMethodField()

    class Meta:
        model = Guardian
        fields = [
            'id', 'user', 'user_name', 'user_email', 'school',
            'cpf', 'relationship', 'occupation', 'phone',
            'alternate_phone', 'address', 'city', 'state',
            'students', 'students_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_students_count(self, obj):
        return obj.students.count()


class GuardianListSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = Guardian
        fields = ['id', 'user_name', 'cpf', 'relationship']

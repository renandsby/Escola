from rest_framework import serializers
from .models import Class


class ClassSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True)
    classroom_number = serializers.CharField(source='classroom.number', read_only=True)
    subjects = serializers.StringRelatedField(many=True, read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = [
            'id', 'school', 'name', 'code', 'year', 'semester',
            'grade_level', 'teacher', 'teacher_name', 'classroom',
            'classroom_number', 'subjects', 'status', 'student_count',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_student_count(self, obj):
        return obj.get_student_count()


class ClassListSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True)

    class Meta:
        model = Class
        fields = ['id', 'name', 'code', 'grade_level', 'teacher_name', 'status']

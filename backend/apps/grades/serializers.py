from rest_framework import serializers
from .models import Grade


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_name = serializers.CharField(source='class_obj.name', read_only=True)
    average = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = [
            'id', 'student', 'student_name', 'subject', 'subject_name',
            'class_obj', 'class_name', 'first_period', 'second_period',
            'third_period', 'fourth_period', 'participation', 'behavior',
            'final_exam', 'average', 'status', 'notes',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_average(self, obj):
        return obj.get_average()


class GradeListSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    average = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = ['id', 'student_name', 'subject_name', 'average', 'status']

    def get_average(self, obj):
        return obj.get_average()

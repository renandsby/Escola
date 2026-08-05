from rest_framework import serializers
from .models import Curriculum


class CurriculumSerializer(serializers.ModelSerializer):
    subjects = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = Curriculum
        fields = [
            'id', 'school', 'name', 'grade_level', 'year',
            'subjects', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

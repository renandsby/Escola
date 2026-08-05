from rest_framework import serializers
from .models import Classroom


class ClassroomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = [
            'id', 'school', 'number', 'capacity', 'floor', 'building',
            'has_projector', 'has_whiteboard', 'has_blackboard',
            'has_air_conditioning', 'has_wifi',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

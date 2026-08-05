from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'title', 'message', 'notification_type',
            'read', 'read_at', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'read_at', 'created_at', 'updated_at']

from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_name', 'recipient', 'recipient_name',
            'subject', 'body', 'read', 'read_at',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'read_at', 'created_at', 'updated_at']


class MessageCreateSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender_name', 'recipient', 'recipient_name',
            'subject', 'body', 'read', 'read_at',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'read_at', 'created_at', 'updated_at', 'sender_name']

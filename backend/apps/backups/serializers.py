from rest_framework import serializers

from .models import Backup


class BackupSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(
        source='requested_by.get_full_name', read_only=True, default=''
    )

    class Meta:
        model = Backup
        fields = [
            'id', 'backup_type', 'triggered_by', 'status', 'size_mb', 'checksum',
            'error_log', 'requested_by_name', 'started_at', 'finished_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

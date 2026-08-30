from rest_framework import serializers

from apps.reports.catalog import ReportDef
from apps.reports.models import Report, ReportExecution


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'id', 'school', 'title', 'report_type', 'file',
            'description', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReportDefSerializer(serializers.Serializer):
    key = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    scopes = serializers.ListField(child=serializers.CharField())
    formats = serializers.ListField(child=serializers.CharField())
    contains_personal_data = serializers.BooleanField()
    parameters = serializers.ListField(child=serializers.CharField())
    tone = serializers.CharField()
    estimate_seconds = serializers.IntegerField()

    @staticmethod
    def from_def(d: ReportDef) -> dict:
        return {
            'key': d.key,
            'name': d.name,
            'description': d.description,
            'scopes': list(d.scopes),
            'formats': list(d.formats),
            'contains_personal_data': d.contains_personal_data,
            'parameters': list(d.parameters),
            'tone': d.tone,
            'estimate_seconds': d.estimate_seconds,
        }


class ReportExecutionSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    scope_title = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = ReportExecution
        fields = [
            'id', 'report_key', 'requested_by_name', 'scope_level', 'scope_title',
            'output_format', 'contains_personal_data', 'status', 'row_count',
            'file_size', 'error_code', 'error_details', 'created_at',
            'started_at', 'finished_at', 'expires_at', 'is_expired', 'download_url',
        ]

    def get_scope_title(self, obj):
        if obj.class_group_id:
            return f'{obj.school.name} · {obj.class_group.name}' if obj.school_id else 'Turma'
        if obj.school_id:
            return obj.school.name
        if obj.education_department_id:
            return f'Rede municipal de {obj.education_department.municipality_name}'
        return 'Rede municipal'

    def get_download_url(self, obj):
        if obj.status != 'DONE' or obj.is_expired:
            return None
        return f'/api/v1/reports/executions/{obj.id}/download/'


class CreateExecutionSerializer(serializers.Serializer):
    report_key = serializers.CharField()
    parameters = serializers.DictField(required=False, default=dict)

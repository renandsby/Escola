from datetime import timedelta

from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsSMEAdmin

from .selectors.audit import get_audit_logs_for_user
from .serializers import AuditLogSerializer

_ACTION_LABEL = {
    'CREATE': 'Criou',
    'UPDATE': 'Atualizou',
    'DELETE': 'Removeu',
    'LOGIN': 'Fez login',
    'LOGIN_FAILED': 'Tentativa de login',
    'REPORT_GENERATED': 'Gerou relatório',
}
_RESOURCE_LABEL = {
    'students': 'aluno', 'enrollments': 'matrícula', 'classes': 'turma',
    'schools': 'escola', 'sme': 'transferência', 'grades': 'notas',
    'attendance': 'frequência', 'documents': 'documento', 'reports': 'relatório',
    'communications': 'mensagem', 'ReportExecution': 'relatório', 'auth': 'acesso',
}


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsSMEAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'model_name', 'user']
    search_fields = ['object_id', 'ip_address', 'request_path']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return get_audit_logs_for_user(user=self.request.user)

    @action(detail=False, methods=['get'])
    def recent_activities(self, request):
        """Atividade recente para o painel (últimos 7 dias, top 12)."""
        since = now() - timedelta(days=7)
        logs = self.get_queryset().filter(created_at__gte=since)[:12]
        return Response([
            {
                'id': str(log.id),
                'user': log.user.get_full_name() if log.user_id else 'Sistema',
                'summary': self._summary(log),
                'timestamp': log.created_at,
            }
            for log in logs
        ])

    @staticmethod
    def _summary(log) -> str:
        verb = _ACTION_LABEL.get(log.action, log.action)
        if log.action in ('LOGIN', 'LOGIN_FAILED'):
            return verb
        resource = _RESOURCE_LABEL.get(log.model_name, log.model_name or 'registro')
        return f'{verb} {resource}'.strip()

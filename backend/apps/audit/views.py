from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.timezone import now
from datetime import timedelta
from .models import AuditLog
from .serializers import AuditLogSerializer
from core.permissions import IsAdmin


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'model_name']
    search_fields = ['object_id', 'ip_address']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def recent_activities(self, request):
        """Retorna atividades recentes do dashboard"""
        # Buscar últimas 10 atividades dos últimos 7 dias
        seven_days_ago = now() - timedelta(days=7)
        activities = AuditLog.objects.filter(created_at__gte=seven_days_ago)[:10]

        formatted_activities = []
        for activity in activities:
            action_text = {
                'create': f"Criou {activity.model_name}",
                'update': f"Atualizou {activity.model_name}",
                'delete': f"Deletou {activity.model_name}",
                'login': "Fez login",
            }.get(activity.action, activity.action)

            formatted_activities.append({
                'id': str(activity.id),
                'user': activity.user.get_full_name() if activity.user else 'Sistema',
                'action': action_text,
                'model': activity.model_name,
                'timestamp': activity.created_at,
                'time_ago': self._time_ago(activity.created_at),
            })

        return Response(formatted_activities)

    @staticmethod
    def _time_ago(dt):
        """Calcula tempo decorrido em formato legível"""
        diff = now() - dt

        if diff.total_seconds() < 60:
            return "Há poucos segundos"
        elif diff.total_seconds() < 3600:
            mins = int(diff.total_seconds() / 60)
            return f"Há {mins}m"
        elif diff.total_seconds() < 86400:
            hours = int(diff.total_seconds() / 3600)
            return f"Há {hours}h"
        elif diff.total_seconds() < 604800:
            days = int(diff.total_seconds() / 86400)
            return f"Há {days}d"
        else:
            return dt.strftime("%d/%m/%Y")

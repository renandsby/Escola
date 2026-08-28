from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.selectors.summary import get_dashboard_summary

from .models import DashboardWidget
from .serializers import DashboardWidgetSerializer


class DashboardWidgetViewSet(viewsets.ModelViewSet):
    serializer_class = DashboardWidgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['widget_type']
    ordering_fields = ['position', 'created_at']
    ordering = ['position']

    def get_queryset(self):
        return DashboardWidget.objects.filter(user=self.request.user, is_active=True)


class DashboardSummaryView(APIView):
    """Contadores do painel inicial (alunos, turmas, disciplinas, escolas…),
    filtrados pelo escopo do papel do usuário."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(get_dashboard_summary(user=request.user))

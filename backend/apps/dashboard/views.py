from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.selectors.context import get_network_context
from apps.dashboard.selectors.overview import DASHBOARD_ROLES, get_dashboard_overview
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


class NetworkContextView(APIView):
    """Município da rede + período letivo corrente para o `AppHeader`.
    Disponível para qualquer usuário autenticado."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(get_network_context(user=request.user))


class DashboardOverviewView(APIView):
    """Visão geral de gestão. Rede inteira para papéis SME; escola própria para
    direção/secretaria. Indisponível para professores e responsáveis."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', None) not in DASHBOARD_ROLES:
            raise PermissionDenied('Painel gerencial disponível apenas para gestão da rede e das escolas.')
        q = request.query_params
        return Response(
            get_dashboard_overview(
                user=request.user,
                scope=q.get('scope'),
                school_id=q.get('school_id'),
                stage=q.get('stage'),
                shift=q.get('shift'),
                term=q.get('term'),
            )
        )

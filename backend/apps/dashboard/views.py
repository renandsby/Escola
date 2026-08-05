from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
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

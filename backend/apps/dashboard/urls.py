from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DashboardOverviewView,
    DashboardSummaryView,
    DashboardWidgetViewSet,
    NetworkContextView,
)

router = DefaultRouter()
router.register(r'', DashboardWidgetViewSet, basename='dashboard-widget')

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('overview/', DashboardOverviewView.as_view(), name='dashboard-overview'),
    path('context/', NetworkContextView.as_view(), name='dashboard-context'),
    path('', include(router.urls)),
]

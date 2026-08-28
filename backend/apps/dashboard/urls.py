from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DashboardSummaryView, DashboardWidgetViewSet

router = DefaultRouter()
router.register(r'', DashboardWidgetViewSet, basename='dashboard-widget')

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('', include(router.urls)),
]

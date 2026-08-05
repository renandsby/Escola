from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardWidgetViewSet

router = DefaultRouter()
router.register(r'', DashboardWidgetViewSet, basename='dashboard-widget')

urlpatterns = [
    path('', include(router.urls)),
]

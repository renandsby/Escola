from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BackupViewSet

router = DefaultRouter()
router.register(r'', BackupViewSet, basename='backup')

urlpatterns = [
    path('', include(router.urls)),
]

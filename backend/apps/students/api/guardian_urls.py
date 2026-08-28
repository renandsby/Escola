from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import GuardianViewSet, StudentGuardianViewSet

router = DefaultRouter()
router.register(r'links', StudentGuardianViewSet, basename='student-guardian')
router.register(r'', GuardianViewSet, basename='guardian')

urlpatterns = [
    path('', include(router.urls)),
]

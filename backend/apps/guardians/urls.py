from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GuardianViewSet

router = DefaultRouter()
router.register(r'', GuardianViewSet, basename='guardian')

urlpatterns = [
    path('', include(router.urls)),
]

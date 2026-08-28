from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EnrollmentViewSet, TransferRequestViewSet

router = DefaultRouter()
router.register(r'transfers', TransferRequestViewSet, basename='transfer-request')
router.register(r'', EnrollmentViewSet, basename='enrollment')

urlpatterns = [
    path('', include(router.urls)),
]

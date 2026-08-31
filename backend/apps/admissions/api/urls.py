from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdmissionCycleViewSet,
    EnrollmentRequestViewSet,
    PriorityEvidenceViewSet,
    RenewalRequestViewSet,
)

router = DefaultRouter()
router.register(r'cycles', AdmissionCycleViewSet, basename='admission-cycle')
router.register(r'renewals', RenewalRequestViewSet, basename='admission-renewal')
router.register(r'enrollment-requests', EnrollmentRequestViewSet, basename='enrollment-request')
router.register(r'evidence', PriorityEvidenceViewSet, basename='priority-evidence')

urlpatterns = [
    path('', include(router.urls)),
]

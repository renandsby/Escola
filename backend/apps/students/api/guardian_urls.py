from django.urls import include, path
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView

from core.permissions import IsEmailVerified
from apps.students.selectors.guardians import get_dependents_summary
from .views import (
    GuardianLinkByCodeView,
    GuardianLinkRequestViewSet,
    GuardianViewSet,
    StudentGuardianViewSet,
)


class MyDependentsView(APIView):
    """GET /api/v1/guardians/my-dependents/ — resumo de cada filho do responsável."""

    permission_classes = [IsEmailVerified]

    def get(self, request):
        return Response(get_dependents_summary(user=request.user))


router = DefaultRouter()
router.register(r'link-requests', GuardianLinkRequestViewSet, basename='guardian-link-request')
router.register(r'links', StudentGuardianViewSet, basename='student-guardian')
router.register(r'', GuardianViewSet, basename='guardian')

urlpatterns = [
    path('my-dependents/', MyDependentsView.as_view(), name='my-dependents'),
    path('link-by-code/', GuardianLinkByCodeView.as_view(), name='guardian-link-by-code'),
    path('', include(router.urls)),
]

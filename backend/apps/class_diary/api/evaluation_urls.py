from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DescriptiveEvaluationViewSet

router = DefaultRouter()
router.register(r'', DescriptiveEvaluationViewSet, basename='descriptive-evaluation')

urlpatterns = [
    path('', include(router.urls)),
]

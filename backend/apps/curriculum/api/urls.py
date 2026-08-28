from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.governance.api.views import EducationStageViewSet

from .views import CurriculumMatrixItemViewSet, CurriculumMatrixViewSet

router = DefaultRouter()
router.register(r'stages', EducationStageViewSet, basename='education-stage')
router.register(r'matrices', CurriculumMatrixViewSet, basename='curriculum-matrix')
router.register(r'matrix-items', CurriculumMatrixItemViewSet, basename='curriculum-matrix-item')

urlpatterns = [
    path('', include(router.urls)),
]

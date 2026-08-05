from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CurriculumViewSet

router = DefaultRouter()
router.register(r'', CurriculumViewSet, basename='curriculum')

urlpatterns = [
    path('', include(router.urls)),
]

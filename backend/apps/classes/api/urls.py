from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SchoolClassViewSet

router = DefaultRouter()
router.register(r'', SchoolClassViewSet, basename='class')

urlpatterns = [
    path('', include(router.urls)),
]

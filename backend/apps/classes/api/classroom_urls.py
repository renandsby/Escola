from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClassroomViewSet

router = DefaultRouter()
router.register(r'', ClassroomViewSet, basename='classroom')

urlpatterns = [
    path('', include(router.urls)),
]

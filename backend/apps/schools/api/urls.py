from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolViewSet

router = DefaultRouter()
router.register(r'', SchoolViewSet, basename='school')

urlpatterns = [
    path('', include(router.urls)),
]

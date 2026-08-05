from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassViewSet

router = DefaultRouter()
router.register(r'', ClassViewSet, basename='class')

urlpatterns = [
    path('', include(router.urls)),
]

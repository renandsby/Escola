from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolHistoryViewSet

router = DefaultRouter()
router.register(r'', SchoolHistoryViewSet, basename='school-history')

urlpatterns = [
    path('', include(router.urls)),
]

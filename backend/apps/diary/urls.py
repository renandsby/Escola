from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DiaryEntryViewSet

router = DefaultRouter()
router.register(r'', DiaryEntryViewSet, basename='diary-entry')

urlpatterns = [
    path('', include(router.urls)),
]

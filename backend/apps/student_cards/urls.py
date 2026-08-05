from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentCardViewSet

router = DefaultRouter()
router.register(r'', StudentCardViewSet, basename='student-card')

urlpatterns = [
    path('', include(router.urls)),
]

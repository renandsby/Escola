from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TeacherAllocationViewSet, TeacherProfileViewSet

router = DefaultRouter()
router.register(r'allocations', TeacherAllocationViewSet, basename='teacher-allocation')
router.register(r'', TeacherProfileViewSet, basename='teacher')

urlpatterns = [
    path('', include(router.urls)),
]

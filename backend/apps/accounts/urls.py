from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    UserViewSet,
    PermissionViewSet,
    ProfileViewSet,
    LoginLogViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'permissions', PermissionViewSet, basename='permission')
router.register(r'profiles', ProfileViewSet, basename='profile')
router.register(r'login-logs', LoginLogViewSet, basename='login-log')

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('', include(router.urls)),
]

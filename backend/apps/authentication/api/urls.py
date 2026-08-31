from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView,
    UserViewSet,
    PermissionViewSet,
    ProfileViewSet,
    LoginLogViewSet,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    EmailVerificationConfirmView,
    EmailVerificationResendView,
    TOTPViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'permissions', PermissionViewSet, basename='permission')
router.register(r'profiles', ProfileViewSet, basename='profile')
router.register(r'login-logs', LoginLogViewSet, basename='login-log')
router.register(r'totp', TOTPViewSet, basename='totp')

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('verify-email/', EmailVerificationConfirmView.as_view(), name='verify-email'),
    path('resend-verification/', EmailVerificationResendView.as_view(), name='resend-verification'),
    path('', include(router.urls)),
]

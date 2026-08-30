from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from core.models import User, UserRole
from core.permissions import IsAdmin

from core.exceptions import BusinessLogicError
from apps.authentication.services.password_reset_service import (
    confirm_password_reset,
    request_password_reset,
)
from apps.authentication.services import totp_service
from apps.authentication.services.challenge_token import resolve_challenge_token

from apps.authentication.selectors.users import get_users_for_user
from apps.authentication.models import Permission, Profile, LoginLog
from apps.authentication.permissions import IsSelfOrAdmin
from .serializers import (
    PermissionSerializer,
    ProfileSerializer,
    LoginLogSerializer,
    CustomTokenObtainPairSerializer,
    UserRegistrationSerializer,
    AdminUserCreationSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    UserProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    build_jwt_payload,
    TOTPConfirmSerializer,
    TOTPConfirmResponseSerializer,
    TOTPEnableResponseSerializer,
    TOTPStatusSerializer,
    TOTPVerifySerializer,
)


class LoginView(TokenObtainPairView):
    """Endpoint de login."""

    serializer_class = CustomTokenObtainPairSerializer


class PasswordResetRequestView(APIView):
    """POST /api/v1/accounts/password-reset/request/ — sempre 200 genérico."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_password_reset(
            email_or_username=serializer.validated_data['email_or_username']
        )
        return Response(
            {
                'detail': 'Se houver uma conta com esse identificador, '
                'enviamos um link de redefinição.'
            }
        )


class PasswordResetConfirmView(APIView):
    """POST /api/v1/accounts/password-reset/confirm/."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        confirm_password_reset(
            token=serializer.validated_data['token'],
            new_password=serializer.validated_data['new_password'],
        )
        return Response({'detail': 'Senha redefinida com sucesso. Faça login.'})


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar usuários."""

    queryset = User.objects.filter(is_active=True)
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'school', 'education_department', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'created_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsAdmin()]
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsAdmin()]
        if self.action in ('update', 'partial_update'):
            return [permissions.IsAuthenticated(), IsSelfOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        # sme_admin gerencia usuários da rede, inclusive os desativados
        if getattr(user, 'role', None) == UserRole.SME_ADMIN and user.education_department_id:
            return User.objects.filter(
                education_department_id=user.education_department_id
            ).select_related('school')
        return get_users_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        if self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        if self.action == 'retrieve':
            return UserProfileSerializer
        return UserProfileSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Registrar novo usuário."""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    'user': UserProfileSerializer(user).data,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Obter dados do usuário autenticado."""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """Atualizar perfil do usuário."""
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=request.method == 'PATCH',
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Mudar senha do usuário."""
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request},
        )
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Senha alterada com sucesso.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def login_history(self, request):
        """Obter histórico de login do usuário."""
        logs = LoginLog.objects.filter(user=request.user).order_by('-login_time')[:10]
        serializer = LoginLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def create_user(self, request):
        """Admin criar novo usuário (pode definir o papel)."""
        serializer = AdminUserCreationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                UserProfileSerializer(user).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para visualizar permissões."""

    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['module']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'module']


class ProfileViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar perfis."""

    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class LoginLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para visualizar logs de login."""

    queryset = LoginLog.objects.all()
    serializer_class = LoginLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['user', 'success']
    ordering_fields = ['login_time']
    ordering = ['-login_time']

    def get_queryset(self):
        """Filtrar logs apenas do usuário autenticado ou admin."""
        if self.request.user.role == UserRole.SME_ADMIN:
            return LoginLog.objects.all()
        return LoginLog.objects.filter(user=self.request.user)


class TOTPViewSet(viewsets.ViewSet):
    """Autenticação em dois fatores (TOTP).

    - ``GET  /accounts/totp/status/``  — situação do 2FA do usuário
    - ``POST /accounts/totp/enable/``  — inicia a ativação (QR code + segredo)
    - ``POST /accounts/totp/confirm/`` — confirma com o 1º código → backup codes
    - ``POST /accounts/totp/disable/`` — desativa o 2FA
    - ``POST /accounts/totp/verify/``  — 2ª etapa do login (público, challenge token)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer(self, *args, **kwargs):  # pragma: no cover - drf-spectacular
        return TOTPStatusSerializer(*args, **kwargs)

    @action(detail=False, methods=['get'])
    def status(self, request):
        device = totp_service.get_confirmed_device(request.user)
        data = {
            'enabled': device is not None,
            'confirmed_at': device.confirmed_at if device else None,
            'backup_codes_remaining': (
                totp_service.remaining_backup_codes(request.user) if device else 0
            ),
        }
        return Response(TOTPStatusSerializer(data).data)

    @action(detail=False, methods=['post'])
    def enable(self, request):
        result = totp_service.generate_totp_secret(request.user)
        return Response(TOTPEnableResponseSerializer(result).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def confirm(self, request):
        serializer = TOTPConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = totp_service.confirm_totp(request.user, serializer.validated_data['code'])
        return Response(TOTPConfirmResponseSerializer(result).data)

    @action(detail=False, methods=['post'])
    def disable(self, request):
        totp_service.disable_totp(request.user)
        return Response({'detail': '2FA desativado.'})

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[permissions.AllowAny],
        authentication_classes=[],
    )
    def verify(self, request):
        serializer = TOTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = resolve_challenge_token(serializer.validated_data['challenge_token'])

        if not totp_service.verify_totp_code(user, serializer.validated_data['code']):
            raise BusinessLogicError(
                code='INVALID_2FA_CODE',
                message='Código inválido ou expirado.',
            )

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        return Response({'requires_2fa': False, **build_jwt_payload(user, refresh)})

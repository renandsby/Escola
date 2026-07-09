from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from core.models import User
from core.permissions import IsAdmin
from .models import Permission, Profile, LoginLog
from .serializers import (
    PermissionSerializer,
    ProfileSerializer,
    LoginLogSerializer,
    CustomTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    UserProfileSerializer,
)


class LoginView(TokenObtainPairView):
    """Endpoint de login."""

    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar usuários."""

    queryset = User.objects.filter(is_active=True)
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['role', 'school', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'created_at']
    ordering = ['-created_at']

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
        """Admin criar novo usuário."""
        serializer = UserRegistrationSerializer(data=request.data)
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
    filterset_fields = ['module']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'module']


class ProfileViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar perfis."""

    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class LoginLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para visualizar logs de login."""

    queryset = LoginLog.objects.all()
    serializer_class = LoginLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['user', 'success']
    ordering_fields = ['login_time']
    ordering = ['-login_time']

    def get_queryset(self):
        """Filtrar logs apenas do usuário autenticado ou admin."""
        if self.request.user.role == 'admin':
            return LoginLog.objects.all()
        return LoginLog.objects.filter(user=self.request.user)

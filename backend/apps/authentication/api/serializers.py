from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from core.models import User, UserRole
from core.serializers import CPFSerializerField
from core.validators import normalize_cpf
from apps.authentication.models import Permission, Profile, LoginLog


def build_jwt_payload(user, refresh) -> dict:
    """Corpo padrão de resposta de login (``access`` + ``refresh`` + ``user``)."""
    from apps.authentication.services.email_verification_service import is_verified

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'cpf': user.cpf,
            'email_verified': is_verified(user),
            'school': str(user.school_id) if user.school_id else None,
            'education_department': (
                str(user.education_department_id) if user.education_department_id else None
            ),
        },
    }


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'code', 'description', 'module']


class ProfileSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'name', 'description', 'permissions', 'is_default']


class LoginLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginLog
        fields = ['id', 'ip_address', 'user_agent', 'login_time', 'logout_time', 'success']
        read_only_fields = ['id', 'login_time']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Serializer customizado para obter JWT token.

    O login aceita **CPF ou e-mail** no campo ``identifier`` (o antigo
    ``username`` continua aceito como alias, para retrocompatibilidade).
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # SimpleJWT injeta `username` obrigatório no __init__ — aqui o login é
        # por `identifier` (CPF ou e-mail); os demais viram aliases opcionais.
        self.fields['identifier'] = serializers.CharField(write_only=True, required=False)
        self.fields['email'] = serializers.CharField(write_only=True, required=False)
        if self.username_field in self.fields:
            self.fields[self.username_field].required = False

    def validate(self, attrs):
        from apps.authentication.services.challenge_token import generate_challenge_token
        from apps.authentication.services.totp_service import is_totp_enabled

        ident = attrs.get('identifier') or attrs.get('username') or attrs.get('email')
        password = attrs.get('password')

        if not ident:
            raise serializers.ValidationError(
                {'identifier': 'Informe o CPF ou e-mail.'}
            )

        request = self.context.get('request')
        user = authenticate(request, identifier=ident, password=password)

        if not user:
            raise serializers.ValidationError('Credenciais inválidas.')

        if not user.is_active:
            raise serializers.ValidationError('Usuário inativo.')

        if is_totp_enabled(user):
            # Login em dois passos: devolve só o desafio (5 min).
            return {
                'requires_2fa': True,
                'challenge_token': generate_challenge_token(user),
            }

        return {'requires_2fa': False, **build_jwt_payload(user, self.get_token(user))}

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['school'] = str(user.school_id) if user.school_id else None
        token['education_department'] = (
            str(user.education_department_id) if user.education_department_id else None
        )
        return token


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer para registro de novo usuário.

    O ``username`` é interno e derivado do CPF — não é pedido no cadastro.
    """

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=True)
    cpf = CPFSerializerField(required=True)

    class Meta:
        model = User
        fields = [
            'cpf',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'school',
            'education_department',
        ]

    def validate_cpf(self, value):
        qs = User.objects.filter(cpf=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('CPF já cadastrado para outro usuário.')
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        qs = User.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('E-mail já registrado.')
        return value

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'As senhas não correspondem.'})
        return data

    def create(self, validated_data):
        # Autorregistro nunca pode conceder papel além do menor privilégio;
        # elevação de papel (ex.: sme_admin) só é permitida via IsAdmin
        # (ver UserViewSet.create_user / get_permissions).
        validated_data['role'] = UserRole.STUDENT_GUARDIAN
        validated_data.setdefault('username', validated_data['cpf'])
        user = User.objects.create_user(**validated_data)
        return user


class AdminUserCreationSerializer(UserRegistrationSerializer):
    """Criação de usuário por staff SME/escola — permite escolher o papel.

    Só é usada atrás de ``IsAdmin`` (ver ``UserViewSet.create_user``), nunca
    no autorregistro público, então expor ``role`` aqui não reabre a
    escalação de privilégio corrigida em ``UserRegistrationSerializer``.
    """

    class Meta(UserRegistrationSerializer.Meta):
        fields = UserRegistrationSerializer.Meta.fields + ['role', 'phone']

    def validate(self, data):
        data = super().validate(data)
        role = data.get('role')
        school_roles = {UserRole.SCHOOL_DIRECTOR, UserRole.SCHOOL_SECRETARY}
        if role in school_roles and not data.get('school'):
            raise serializers.ValidationError(
                {'school': 'Diretor e secretário precisam estar vinculados a uma escola.'}
            )
        return data

    def create(self, validated_data):
        validated_data.setdefault('username', validated_data['cpf'])
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualizar dados do usuário.

    Campos administrativos (papel, escola, ativo) só são aceitos de um
    ``sme_admin``; para os demais, uma tentativa de alterá-los é ignorada.
    """

    cpf = CPFSerializerField(required=False)

    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'phone',
            'cpf',
            'avatar',
            'bio',
            'role',
            'school',
            'education_department',
            'is_active',
        ]

    _ADMIN_ONLY = {'role', 'school', 'education_department', 'is_active'}

    def validate_cpf(self, value):
        qs = User.objects.filter(cpf=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('CPF já cadastrado para outro usuário.')
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        qs = User.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('E-mail já registrado.')
        return value

    def validate(self, data):
        request = self.context.get('request')
        actor = getattr(request, 'user', None)
        is_admin = getattr(actor, 'role', None) == UserRole.SME_ADMIN
        if not is_admin:
            for field in self._ADMIN_ONLY:
                data.pop(field, None)
        # `username` acompanha o CPF quando este muda.
        if data.get('cpf'):
            data['username'] = data['cpf']
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para mudar senha."""

    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value

    def validate(self, data):
        if data['new_password'] != data.pop('new_password_confirm'):
            raise serializers.ValidationError({'new_password': 'As senhas não correspondem.'})
        return data

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """Solicitação de redefinição — aceita e-mail ou nome de usuário."""

    email_or_username = serializers.CharField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirmação da redefinição com o token recebido por e-mail."""

    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate(self, data):
        if data['new_password'] != data.pop('new_password_confirm'):
            raise serializers.ValidationError({'new_password': 'As senhas não correspondem.'})
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer para perfil do usuário."""

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'cpf',
            'email_verified',
            'avatar',
            'bio',
            'role',
            'school',
            'school_name',
            'education_department',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'username', 'cpf', 'email_verified', 'created_at', 'updated_at', 'role',
        ]

    email_verified = serializers.SerializerMethodField()

    def get_email_verified(self, obj):
        from apps.authentication.services.email_verification_service import is_verified

        return is_verified(obj)

    school_name = serializers.CharField(source='school.name', read_only=True, allow_null=True)


# ============================================================================
#  2FA / TOTP
# ============================================================================

class TOTPEnableResponseSerializer(serializers.Serializer):
    """Resposta da ativação: QR code + segredo para entrada manual."""

    secret = serializers.CharField(read_only=True)
    qr_code = serializers.CharField(read_only=True)
    device_id = serializers.UUIDField(read_only=True)


class TOTPConfirmSerializer(serializers.Serializer):
    """Confirmação da ativação — código de 6 dígitos do app."""

    code = serializers.RegexField(r'^\d{6}$', required=True)


class TOTPConfirmResponseSerializer(serializers.Serializer):
    backup_codes = serializers.ListField(child=serializers.CharField(), read_only=True)


class TOTPVerifySerializer(serializers.Serializer):
    """Verificação no login — código TOTP (6 dígitos) ou backup (``XXXX-XXXX``)."""

    challenge_token = serializers.CharField(required=True)
    code = serializers.CharField(required=True, min_length=6, max_length=9)


class TOTPStatusSerializer(serializers.Serializer):
    enabled = serializers.BooleanField()
    confirmed_at = serializers.DateTimeField(allow_null=True)
    backup_codes_remaining = serializers.IntegerField()

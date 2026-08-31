from rest_framework import serializers

from core.models import User
from core.validators import is_valid_cpf, normalize_cpf


class CPFSerializerField(serializers.CharField):
    """Campo de CPF para a API: aceita com/sem máscara, normaliza para 11
    dígitos e valida os dígitos verificadores. Serializa sempre os 11 dígitos
    (a máscara é responsabilidade do frontend)."""

    default_error_messages = {
        'invalid_cpf': 'CPF inválido. Informe um CPF válido (11 dígitos).',
    }

    def __init__(self, **kwargs):
        kwargs.setdefault('max_length', 20)  # tolera entrada mascarada / com espaços
        kwargs.setdefault('trim_whitespace', True)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        digits = normalize_cpf(value)
        if not digits:
            if self.required:
                self.fail('blank')
            return digits
        if not is_valid_cpf(digits):
            self.fail('invalid_cpf')
        return digits


class BaseSerializer(serializers.ModelSerializer):
    """Serializer base com campos comuns."""

    class Meta:
        abstract = True
        fields = ['id', 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(BaseSerializer):
    """Serializer para modelo User."""

    class Meta(BaseSerializer.Meta):
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'cpf',
            'avatar',
            'bio',
            'role',
            'school',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'password': {'write_only': True},
        }


class UserDetailSerializer(UserSerializer):
    """Serializer detalhado para usuário."""

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + [
            'last_login',
            'last_login_ip',
            'last_login_agent',
        ]
        read_only_fields = UserSerializer.Meta.read_only_fields + [
            'last_login',
            'last_login_ip',
            'last_login_agent',
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de novo usuário."""

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'role',
            'school',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError(
                {'password': 'As senhas não correspondem.'}
            )
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class PaginatedSerializer(serializers.Serializer):
    """Serializer para dados paginados."""

    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = serializers.ListField()

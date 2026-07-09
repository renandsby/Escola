from rest_framework import serializers
from core.models import User


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
            'document',
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

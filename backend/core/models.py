from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
import uuid


class BaseModel(models.Model):
    """Modelo base para todas as entidades do sistema."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Criado em'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Atualizado em'))
    is_active = models.BooleanField(default=True, verbose_name=_('Ativo'))

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.__class__.__name__} ({self.id})"


class SoftDeleteModel(BaseModel):
    """Modelo base com soft delete."""

    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Deletado em'))

    class Meta:
        abstract = True

    def soft_delete(self):
        """Marca como deletado sem remover do banco."""
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save()

    def restore(self):
        """Restaura um registro deletado."""
        self.deleted_at = None
        self.is_active = True
        self.save()

    @classmethod
    def get_active(cls):
        """Retorna apenas registros não deletados."""
        return cls.objects.filter(deleted_at__isnull=True)


class SchoolMixin(models.Model):
    """Mixin para associar entidades a uma escola."""

    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        verbose_name=_('Escola'),
    )

    class Meta:
        abstract = True


class UserRole(models.TextChoices):
    """Papéis/Permissões de usuários do sistema."""

    ADMIN = 'admin', _('Administrador')
    DIRECTOR = 'director', _('Diretor')
    COORDINATOR = 'coordinator', _('Coordenador')
    SECRETARY = 'secretary', _('Secretária')
    TEACHER = 'teacher', _('Professor')
    GUARDIAN = 'guardian', _('Responsável')
    STUDENT = 'student', _('Aluno')


class User(AbstractUser):
    """Modelo de usuário customizado."""

    email = models.EmailField(unique=True, verbose_name=_('Email'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('Telefone'))
    document = models.CharField(max_length=20, unique=True, blank=True, null=True, verbose_name=_('CPF/CNPJ'))
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name=_('Avatar'))
    bio = models.TextField(blank=True, verbose_name=_('Biografia'))
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.STUDENT,
        verbose_name=_('Papel'),
    )
    school_id = models.CharField(
        max_length=36,
        null=True,
        blank=True,
        verbose_name=_('ID da Escola'),
    )
    last_login_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name=_('Último IP de login'))
    last_login_agent = models.TextField(blank=True, verbose_name=_('Último agente'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Criado em'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Atualizado em'))

    class Meta:
        verbose_name = _('Usuário')
        verbose_name_plural = _('Usuários')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['document']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"

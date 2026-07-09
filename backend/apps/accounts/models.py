from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Permission(BaseModel):
    """Modelo de permissão customizada."""

    name = models.CharField(max_length=255, unique=True, verbose_name=_('Nome'))
    code = models.CharField(max_length=100, unique=True, verbose_name=_('Código'))
    description = models.TextField(blank=True, verbose_name=_('Descrição'))
    module = models.CharField(max_length=100, verbose_name=_('Módulo'))

    class Meta:
        verbose_name = _('Permissão')
        verbose_name_plural = _('Permissões')
        ordering = ['module', 'name']

    def __str__(self):
        return self.name


class Profile(BaseModel):
    """Perfil de usuário com permissões."""

    name = models.CharField(max_length=100, unique=True, verbose_name=_('Nome'))
    description = models.TextField(blank=True, verbose_name=_('Descrição'))
    permissions = models.ManyToManyField(
        Permission,
        related_name='profiles',
        blank=True,
        verbose_name=_('Permissões'),
    )
    is_default = models.BooleanField(default=False, verbose_name=_('É padrão'))

    class Meta:
        verbose_name = _('Perfil')
        verbose_name_plural = _('Perfis')
        ordering = ['name']

    def __str__(self):
        return self.name


class LoginLog(BaseModel):
    """Log de login do usuário."""

    user = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name='login_logs',
        verbose_name=_('Usuário'),
    )
    ip_address = models.GenericIPAddressField(verbose_name=_('Endereço IP'))
    user_agent = models.TextField(blank=True, verbose_name=_('User Agent'))
    login_time = models.DateTimeField(auto_now_add=True, verbose_name=_('Hora do login'))
    logout_time = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Hora do logout'),
    )
    success = models.BooleanField(default=True, verbose_name=_('Login bem-sucedido'))

    class Meta:
        verbose_name = _('Log de Login')
        verbose_name_plural = _('Logs de Login')
        ordering = ['-login_time']

    def __str__(self):
        return f"{self.user} - {self.login_time}"


class PasswordReset(BaseModel):
    """Requisição de reset de senha."""

    user = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name='password_resets',
        verbose_name=_('Usuário'),
    )
    token = models.CharField(max_length=255, unique=True, verbose_name=_('Token'))
    used = models.BooleanField(default=False, verbose_name=_('Utilizado'))
    expires_at = models.DateTimeField(verbose_name=_('Expira em'))

    class Meta:
        verbose_name = _('Reset de Senha')
        verbose_name_plural = _('Resets de Senha')
        ordering = ['-created_at']

    def __str__(self):
        return f"Reset para {self.user} - {self.created_at}"


class EmailVerification(BaseModel):
    """Verificação de email."""

    user = models.OneToOneField(
        'core.User',
        on_delete=models.CASCADE,
        related_name='email_verification',
        verbose_name=_('Usuário'),
    )
    token = models.CharField(max_length=255, unique=True, verbose_name=_('Token'))
    verified = models.BooleanField(default=False, verbose_name=_('Verificado'))
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Verificado em'))

    class Meta:
        verbose_name = _('Verificação de Email')
        verbose_name_plural = _('Verificações de Email')

    def __str__(self):
        return f"Verificação de {self.user.email}"

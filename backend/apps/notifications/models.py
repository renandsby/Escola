from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel, User


class Notification(BaseModel):
    """Modelo de Notificação."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', verbose_name=_('Usuário'))
    title = models.CharField(max_length=255, verbose_name=_('Título'))
    message = models.TextField(verbose_name=_('Mensagem'))
    notification_type = models.CharField(max_length=50, verbose_name=_('Tipo'))

    read = models.BooleanField(default=False, verbose_name=_('Lido'))
    read_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Lido em'))

    class Meta:
        verbose_name = _('Notificação')
        verbose_name_plural = _('Notificações')
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'read'])]

    def __str__(self):
        return self.title

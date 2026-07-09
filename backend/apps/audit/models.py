from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel, User


class AuditLog(BaseModel):
    """Modelo de Log de Auditoria."""

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs', verbose_name=_('Usuário'))
    action = models.CharField(max_length=255, verbose_name=_('Ação'))
    model_name = models.CharField(max_length=100, verbose_name=_('Modelo'))
    object_id = models.CharField(max_length=255, verbose_name=_('ID do Objeto'))
    changes = models.JSONField(verbose_name=_('Mudanças'))
    ip_address = models.GenericIPAddressField(verbose_name=_('IP'))

    class Meta:
        verbose_name = _('Log de Auditoria')
        verbose_name_plural = _('Logs de Auditoria')
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'created_at'])]

    def __str__(self):
        return f"{self.action} - {self.model_name}"

from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel, User


class AuditLog(BaseModel):
    """Trilha de auditoria forense — toda escrita relevante grava um registro
    aqui (P1-AUDIT). Dados sensíveis são removidos antes da persistência.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
        verbose_name=_('Usuário'),
    )
    action = models.CharField(max_length=64, verbose_name=_('Ação'))
    model_name = models.CharField(max_length=100, blank=True, verbose_name=_('Recurso'))
    object_id = models.CharField(max_length=255, blank=True, verbose_name=_('ID do objeto'))
    changes = models.JSONField(default=dict, blank=True, verbose_name=_('Detalhes'))
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name=_('IP'))
    user_agent = models.TextField(blank=True, verbose_name=_('User-Agent'))
    request_method = models.CharField(max_length=8, blank=True)
    request_path = models.CharField(max_length=255, blank=True)
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = _('Log de Auditoria')
        verbose_name_plural = _('Logs de Auditoria')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['model_name', 'created_at']),
        ]

    def __str__(self):
        return f"{self.action} · {self.model_name} · {self.created_at:%Y-%m-%d %H:%M}"

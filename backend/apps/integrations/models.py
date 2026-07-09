from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Integration(BaseModel):
    """Modelo de Integração com Sistemas Externos."""

    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='integrations', verbose_name=_('Escola'))
    name = models.CharField(max_length=100, verbose_name=_('Nome'))
    integration_type = models.CharField(max_length=50, verbose_name=_('Tipo'))
    api_key = models.CharField(max_length=255, verbose_name=_('API Key'))
    is_active = models.BooleanField(default=True, verbose_name=_('Ativo'))
    config = models.JSONField(default=dict, verbose_name=_('Configuração'))

    class Meta:
        verbose_name = _('Integração')
        verbose_name_plural = _('Integrações')

    def __str__(self):
        return self.name

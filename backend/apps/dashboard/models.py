from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class DashboardWidget(BaseModel):
    """Modelo de Widget do Dashboard."""

    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='dashboard_widgets', verbose_name=_('Usuário'))
    widget_type = models.CharField(max_length=100, verbose_name=_('Tipo de Widget'))
    title = models.CharField(max_length=255, verbose_name=_('Título'))
    position = models.IntegerField(verbose_name=_('Posição'))
    settings = models.JSONField(default=dict, verbose_name=_('Configurações'))

    class Meta:
        verbose_name = _('Widget do Dashboard')
        verbose_name_plural = _('Widgets do Dashboard')

    def __str__(self):
        return self.title

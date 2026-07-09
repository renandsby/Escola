from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Report(BaseModel):
    """Modelo de Relatório."""

    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='reports', verbose_name=_('Escola'))
    title = models.CharField(max_length=255, verbose_name=_('Título'))
    report_type = models.CharField(max_length=50, verbose_name=_('Tipo'))
    file = models.FileField(upload_to='reports/%Y/%m/', verbose_name=_('Arquivo'))
    description = models.TextField(blank=True, verbose_name=_('Descrição'))

    class Meta:
        verbose_name = _('Relatório')
        verbose_name_plural = _('Relatórios')
        ordering = ['-created_at']

    def __str__(self):
        return self.title

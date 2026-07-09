from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Backup(BaseModel):
    """Modelo de Backup."""

    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='backups', verbose_name=_('Escola'))
    backup_file = models.FileField(upload_to='backups/%Y/%m/', verbose_name=_('Arquivo de Backup'))
    backup_type = models.CharField(max_length=50, verbose_name=_('Tipo'))
    status = models.CharField(max_length=20, default='completed', verbose_name=_('Status'))
    size_mb = models.FloatField(verbose_name=_('Tamanho (MB)'))

    class Meta:
        verbose_name = _('Backup')
        verbose_name_plural = _('Backups')
        ordering = ['-created_at']

    def __str__(self):
        return f"Backup {self.created_at}"

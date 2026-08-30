from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class BackupStatus(models.TextChoices):
    RUNNING = 'RUNNING', _('Em execução')
    COMPLETED = 'COMPLETED', _('Concluído')
    FAILED = 'FAILED', _('Falhou')


class BackupTrigger(models.TextChoices):
    AUTOMATED = 'automated', _('Automático (agendado)')
    MANUAL = 'manual', _('Manual (sob demanda)')


class Backup(BaseModel):
    """Cópia de segurança do banco de dados da rede (P1-BACKUP).

    ``school`` é opcional: um backup de banco cobre a rede inteira. O campo
    permanece para compatibilidade com eventuais backups por unidade.
    """

    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='backups',
        null=True,
        blank=True,
        verbose_name=_('Escola'),
    )
    requested_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='backups_requested',
        verbose_name=_('Solicitado por'),
    )
    backup_file = models.FileField(
        upload_to='backups/%Y/%m/', null=True, blank=True, verbose_name=_('Arquivo')
    )
    backup_type = models.CharField(max_length=50, default='database', verbose_name=_('Tipo'))
    triggered_by = models.CharField(
        max_length=16, choices=BackupTrigger.choices, default=BackupTrigger.AUTOMATED
    )
    status = models.CharField(
        max_length=20, choices=BackupStatus.choices, default=BackupStatus.RUNNING
    )
    size_mb = models.FloatField(default=0, verbose_name=_('Tamanho (MB)'))
    checksum = models.CharField(max_length=64, blank=True, verbose_name=_('SHA-256'))
    error_log = models.TextField(blank=True, verbose_name=_('Log de erro'))
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _('Backup')
        verbose_name_plural = _('Backups')
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status', 'created_at'])]

    def __str__(self):
        return f"Backup {self.backup_type} · {self.get_status_display()} · {self.created_at:%Y-%m-%d %H:%M}"

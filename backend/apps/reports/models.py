import uuid
from datetime import timedelta

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel

RETENTION_DAYS = 30


class Report(BaseModel):
    """Modelo de Relatório (legado — arquivos avulsos anexados a uma escola)."""

    school = models.ForeignKey(
        'schools.School',
        on_delete=models.PROTECT,
        related_name='reports',
        verbose_name=_('Escola'),
    )
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


class ReportExecutionStatus(models.TextChoices):
    QUEUED = 'QUEUED', _('Na fila')
    PROCESSING = 'PROCESSING', _('Processando')
    DONE = 'DONE', _('Concluído')
    ERROR = 'ERROR', _('Erro')


class ReportExecution(models.Model):
    """Uma geração de relatório — assíncrona e auditada (PLANO_EXECUCAO_DASHBOARD §3.1)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_key = models.CharField(max_length=64, verbose_name=_('Relatório'))
    requested_by = models.ForeignKey(
        'core.User',
        on_delete=models.PROTECT,
        related_name='report_executions',
        verbose_name=_('Solicitante'),
    )
    scope_level = models.CharField(max_length=16, verbose_name=_('Escopo'))  # network|school|class
    education_department = models.ForeignKey(
        'governance.EducationDepartment',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='report_executions',
    )
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='report_executions',
    )
    class_group = models.ForeignKey(
        'classes.SchoolClass',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='report_executions',
    )
    parameters = models.JSONField(default=dict, verbose_name=_('Parâmetros'))
    output_format = models.CharField(max_length=8, verbose_name=_('Formato'))  # PDF|XLSX|CSV|TXT
    contains_personal_data = models.BooleanField(default=False)
    status = models.CharField(
        max_length=16,
        choices=ReportExecutionStatus.choices,
        default=ReportExecutionStatus.QUEUED,
    )
    file = models.FileField(upload_to='reports/%Y/%m/', null=True, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    row_count = models.PositiveIntegerField(null=True, blank=True)
    error_code = models.CharField(max_length=64, blank=True)
    error_details = models.JSONField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(verbose_name=_('Expira em'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Criado em'))

    class Meta:
        verbose_name = _('Execução de Relatório')
        verbose_name_plural = _('Execuções de Relatório')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['requested_by', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['report_key', 'created_at']),
        ]

    def __str__(self):
        return f"{self.report_key} · {self.get_status_display()} ({self.id})"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=RETENTION_DAYS)
        super().save(*args, **kwargs)

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_terminal(self) -> bool:
        return self.status in (ReportExecutionStatus.DONE, ReportExecutionStatus.ERROR)

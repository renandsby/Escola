from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class SchoolHistory(BaseModel):
    """Modelo de Histórico Escolar - Consolidação de desempenho."""

    student = models.OneToOneField(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='school_history',
        verbose_name=_('Aluno'),
    )

    total_classes = models.IntegerField(default=0, verbose_name=_('Total de Aulas'))
    absences = models.IntegerField(default=0, verbose_name=_('Faltas'))
    attendance_percentage = models.FloatField(default=100, verbose_name=_('% Presença'))

    overall_average = models.FloatField(null=True, blank=True, verbose_name=_('Média Geral'))
    final_status = models.CharField(
        max_length=20,
        choices=[('approved', _('Aprovado')), ('failed', _('Reprovado')), ('pending', _('Pendente'))],
        default='pending',
        verbose_name=_('Status Final'),
    )

    last_updated = models.DateTimeField(auto_now=True, verbose_name=_('Última Atualização'))

    class Meta:
        verbose_name = _('Histórico Escolar')
        verbose_name_plural = _('Históricos Escolares')

    def __str__(self):
        return f"Histórico de {self.student}"

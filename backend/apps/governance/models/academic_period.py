from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class AcademicPeriod(BaseModel):
    """Período avaliativo (bimestre/trimestre) do ano letivo."""

    academic_year = models.ForeignKey(
        'governance.AcademicYear',
        on_delete=models.CASCADE,
        related_name='periods',
        verbose_name=_('Ano Letivo'),
    )
    name = models.CharField(max_length=50, verbose_name=_('Nome'))
    period_number = models.PositiveSmallIntegerField(verbose_name=_('Número do período'))
    start_date = models.DateField(verbose_name=_('Início'))
    end_date = models.DateField(verbose_name=_('Fim'))
    grade_deadline = models.DateField(verbose_name=_('Prazo de lançamento de notas'))

    class Meta:
        verbose_name = _('Período Letivo')
        verbose_name_plural = _('Períodos Letivos')
        ordering = ['academic_year', 'period_number']
        constraints = [
            models.UniqueConstraint(
                fields=['academic_year', 'period_number'],
                name='uq_academic_period',
            ),
        ]

    def __str__(self):
        return f"{self.name} — {self.academic_year.year}"

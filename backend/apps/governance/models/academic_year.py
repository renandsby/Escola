from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class AcademicYearStatus(models.TextChoices):
    PLANNED = 'PLANNED', _('Planejado')
    ACTIVE = 'ACTIVE', _('Ativo')
    CLOSED = 'CLOSED', _('Encerrado')


class AcademicYear(BaseModel):
    """Ano letivo municipal unificado."""

    education_department = models.ForeignKey(
        'governance.EducationDepartment',
        on_delete=models.PROTECT,
        related_name='academic_years',
        verbose_name=_('Secretaria'),
    )
    year = models.IntegerField(verbose_name=_('Ano'))
    status = models.CharField(
        max_length=20,
        choices=AcademicYearStatus.choices,
        default=AcademicYearStatus.PLANNED,
        verbose_name=_('Status'),
    )
    start_date = models.DateField(verbose_name=_('Início'))
    end_date = models.DateField(verbose_name=_('Fim'))

    class Meta:
        verbose_name = _('Ano Letivo')
        verbose_name_plural = _('Anos Letivos')
        ordering = ['-year']
        constraints = [
            models.UniqueConstraint(
                fields=['education_department', 'year'],
                name='uq_academic_year_dept',
            ),
        ]

    def __str__(self):
        return f"{self.year} ({self.get_status_display()})"

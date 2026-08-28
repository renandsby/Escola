from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class EducationDepartment(BaseModel):
    """Secretaria Municipal de Educação — tenant raiz."""

    municipality_name = models.CharField(max_length=150, verbose_name=_('Município'))
    ibge_code = models.CharField(max_length=7, unique=True, verbose_name=_('Código IBGE'))
    secretary_name = models.CharField(max_length=150, blank=True, verbose_name=_('Secretário(a)'))
    min_passing_grade = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=6.00,
        verbose_name=_('Nota mínima para aprovação'),
    )
    min_attendance_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=75.00,
        verbose_name=_('Frequência mínima (%)'),
    )

    class Meta:
        verbose_name = _('Secretaria Municipal de Educação')
        verbose_name_plural = _('Secretarias Municipais de Educação')
        ordering = ['municipality_name']

    def __str__(self):
        return f"SME {self.municipality_name}"

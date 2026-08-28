from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class Subject(BaseModel):
    """Componente curricular da base municipal (BNCC)."""

    education_department = models.ForeignKey(
        'governance.EducationDepartment',
        on_delete=models.PROTECT,
        related_name='subjects',
        verbose_name=_('Secretaria'),
    )
    name = models.CharField(max_length=100, verbose_name=_('Nome'))
    bncc_code = models.CharField(max_length=50, blank=True, verbose_name=_('Código BNCC'))
    area_of_knowledge = models.CharField(max_length=100, verbose_name=_('Área do Conhecimento'))
    description = models.TextField(blank=True, verbose_name=_('Descrição'))
    minimum_passing_grade = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=6.00,
        verbose_name=_('Nota Mínima'),
    )

    class Meta:
        verbose_name = _('Disciplina')
        verbose_name_plural = _('Disciplinas')
        constraints = [
            models.UniqueConstraint(
                fields=['education_department', 'name'],
                name='uq_subject_dept_name',
            ),
        ]
        indexes = [
            models.Index(fields=['education_department', 'is_active']),
        ]

    def __str__(self):
        return self.name

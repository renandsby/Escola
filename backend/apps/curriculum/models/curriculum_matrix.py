from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class CurriculumMatrix(BaseModel):
    """Matriz curricular municipal alinhada à BNCC."""

    education_department = models.ForeignKey(
        'governance.EducationDepartment',
        on_delete=models.PROTECT,
        related_name='curriculum_matrices',
        verbose_name=_('Secretaria'),
    )
    education_stage = models.ForeignKey(
        'governance.EducationStage',
        on_delete=models.PROTECT,
        related_name='curriculum_matrices',
        verbose_name=_('Etapa'),
    )
    name = models.CharField(max_length=150, verbose_name=_('Nome'))

    class Meta:
        verbose_name = _('Matriz Curricular')
        verbose_name_plural = _('Matrizes Curriculares')
        ordering = ['name']

    def __str__(self):
        return self.name


class CurriculumMatrixItem(BaseModel):
    """Item da matriz: disciplina + carga horária."""

    curriculum_matrix = models.ForeignKey(
        CurriculumMatrix,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('Matriz'),
    )
    subject = models.ForeignKey(
        'curriculum.Subject',
        on_delete=models.PROTECT,
        related_name='matrix_items',
        verbose_name=_('Disciplina'),
    )
    weekly_hours = models.PositiveIntegerField(verbose_name=_('Horas semanais'))
    annual_hours = models.PositiveIntegerField(verbose_name=_('Horas anuais'))

    class Meta:
        verbose_name = _('Item da Matriz Curricular')
        verbose_name_plural = _('Itens da Matriz Curricular')
        constraints = [
            models.UniqueConstraint(
                fields=['curriculum_matrix', 'subject'],
                name='uq_matrix_subject',
            ),
        ]

    def __str__(self):
        return f"{self.curriculum_matrix.name} — {self.subject}"

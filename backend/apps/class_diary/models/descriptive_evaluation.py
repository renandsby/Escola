from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class DescriptiveEvaluation(BaseModel):
    """Parecer descritivo (Educação Infantil / AEE)."""

    enrollment = models.ForeignKey(
        'students.Enrollment',
        on_delete=models.CASCADE,
        related_name='descriptive_evaluations',
        verbose_name=_('Matrícula'),
    )
    academic_period = models.ForeignKey(
        'governance.AcademicPeriod',
        on_delete=models.PROTECT,
        related_name='descriptive_evaluations',
        verbose_name=_('Período'),
    )
    teacher = models.ForeignKey(
        'core.User',
        on_delete=models.PROTECT,
        related_name='descriptive_evaluations',
        verbose_name=_('Professor'),
    )
    development_report = models.TextField(verbose_name=_('Relatório de desenvolvimento'))
    learning_milestones = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_('Habilidades BNCC'),
    )

    class Meta:
        verbose_name = _('Parecer Descritivo')
        verbose_name_plural = _('Pareceres Descritivos')
        constraints = [
            models.UniqueConstraint(
                fields=['enrollment', 'academic_period'],
                name='uq_descriptive_entry',
            ),
        ]

    def __str__(self):
        return f"Parecer {self.enrollment.student} — {self.academic_period}"

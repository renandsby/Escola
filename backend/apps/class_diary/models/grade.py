from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from core.models import BaseModel


class Grade(BaseModel):
    """Nota quantitativa por matrícula, disciplina e período."""

    enrollment = models.ForeignKey(
        'students.Enrollment',
        on_delete=models.CASCADE,
        related_name='grades',
        verbose_name=_('Matrícula'),
    )
    subject = models.ForeignKey(
        'curriculum.Subject',
        on_delete=models.PROTECT,
        related_name='grades',
        verbose_name=_('Disciplina'),
    )
    academic_period = models.ForeignKey(
        'governance.AcademicPeriod',
        on_delete=models.PROTECT,
        related_name='grades',
        verbose_name=_('Período'),
    )
    teacher = models.ForeignKey(
        'core.User',
        on_delete=models.PROTECT,
        related_name='grades_launched',
        verbose_name=_('Professor'),
    )
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('Nota'),
    )
    recovery_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('Nota de recuperação'),
    )
    final_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('Nota final'),
    )
    assessment_type = models.CharField(
        max_length=50,
        default='PERIOD_EXAM',
        verbose_name=_('Tipo de avaliação'),
    )
    notes = models.TextField(blank=True, verbose_name=_('Observações'))

    class Meta:
        verbose_name = _('Nota')
        verbose_name_plural = _('Notas')
        constraints = [
            models.UniqueConstraint(
                fields=['enrollment', 'subject', 'academic_period'],
                name='uq_grade_entry',
            ),
        ]
        indexes = [
            models.Index(fields=['enrollment', 'subject']),
        ]

    def __str__(self):
        return f"{self.enrollment.student} — {self.subject} ({self.academic_period})"

    def get_effective_score(self):
        if self.final_score is not None:
            return self.final_score
        if self.recovery_score is not None:
            return max(self.score, self.recovery_score)
        return self.score

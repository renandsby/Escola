from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Enrollment(BaseModel):
    """Modelo de Matrícula - Relaciona Aluno com Turma."""

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name=_('Aluno'),
    )
    class_obj = models.ForeignKey(
        'classes.Class',
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name=_('Turma'),
    )
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name=_('Escola'),
    )

    enrollment_date = models.DateField(auto_now_add=True, verbose_name=_('Data de Matrícula'))
    withdrawal_date = models.DateField(null=True, blank=True, verbose_name=_('Data de Retirada'))

    status = models.CharField(
        max_length=20,
        choices=[
            ('active', _('Ativo')),
            ('inactive', _('Inativo')),
            ('transferred', _('Transferido')),
            ('dropped', _('Desistente')),
        ],
        default='active',
        verbose_name=_('Status'),
    )

    class Meta:
        verbose_name = _('Matrícula')
        verbose_name_plural = _('Matrículas')
        unique_together = ['student', 'class_obj']
        indexes = [
            models.Index(fields=['school', 'class_obj', 'status']),
            models.Index(fields=['student', 'status']),
        ]

    def __str__(self):
        return f"{self.student} em {self.class_obj}"

from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Attendance(BaseModel):
    """Modelo de Frequência - Registro de presença/ausência."""

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='attendances',
        verbose_name=_('Aluno'),
    )
    class_obj = models.ForeignKey(
        'classes.Class',
        on_delete=models.CASCADE,
        related_name='attendances',
        verbose_name=_('Turma'),
    )
    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.CASCADE,
        related_name='attendances',
        verbose_name=_('Disciplina'),
    )

    date = models.DateField(verbose_name=_('Data'))
    status = models.CharField(
        max_length=20,
        choices=[
            ('present', _('Presente')),
            ('absent', _('Ausente')),
            ('justified', _('Justificado')),
            ('excused', _('Permitido')),
        ],
        verbose_name=_('Status'),
    )

    observation = models.TextField(blank=True, verbose_name=_('Observação'))

    class Meta:
        verbose_name = _('Frequência')
        verbose_name_plural = _('Frequências')
        unique_together = ['student', 'class_obj', 'subject', 'date']
        indexes = [
            models.Index(fields=['student', 'class_obj', 'date']),
            models.Index(fields=['date', 'status']),
        ]

    def __str__(self):
        return f"{self.student} - {self.date} ({self.get_status_display()})"

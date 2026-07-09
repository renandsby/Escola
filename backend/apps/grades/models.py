from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel
from django.core.validators import MinValueValidator, MaxValueValidator


class Grade(BaseModel):
    """Modelo de Nota - Desempenho do aluno em uma disciplina."""

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='grades',
        verbose_name=_('Aluno'),
    )
    subject = models.ForeignKey(
        'subjects.Subject',
        on_delete=models.CASCADE,
        related_name='grades',
        verbose_name=_('Disciplina'),
    )
    class_obj = models.ForeignKey(
        'classes.Class',
        on_delete=models.CASCADE,
        related_name='grades',
        verbose_name=_('Turma'),
    )

    # Notas por período
    first_period = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('1º Período'),
    )
    second_period = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('2º Período'),
    )
    third_period = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('3º Período'),
    )
    fourth_period = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('4º Período'),
    )

    # Avaliações
    participation = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('Participação'),
    )
    behavior = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('Comportamento'),
    )
    final_exam = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_('Prova Final'),
    )

    # Resultado
    status = models.CharField(
        max_length=20,
        choices=[
            ('approved', _('Aprovado')),
            ('failed', _('Reprovado')),
            ('pending', _('Pendente')),
        ],
        default='pending',
        verbose_name=_('Status'),
    )

    notes = models.TextField(blank=True, verbose_name=_('Observações'))

    class Meta:
        verbose_name = _('Nota')
        verbose_name_plural = _('Notas')
        unique_together = ['student', 'subject', 'class_obj']
        indexes = [
            models.Index(fields=['student', 'class_obj', 'status']),
        ]

    def __str__(self):
        return f"{self.student} - {self.subject}"

    def get_average(self):
        """Calcula a média de notas."""
        grades = [self.first_period, self.second_period, self.third_period, self.fourth_period]
        grades = [g for g in grades if g is not None]
        return sum(grades) / len(grades) if grades else None

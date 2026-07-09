from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Subject(BaseModel):
    """Modelo de Disciplina/Matéria."""

    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='subjects',
        verbose_name=_('Escola'),
    )

    name = models.CharField(max_length=100, verbose_name=_('Nome'))
    code = models.CharField(max_length=20, verbose_name=_('Código'))
    description = models.TextField(blank=True, verbose_name=_('Descrição'))

    # Carga horária
    workload = models.IntegerField(default=60, verbose_name=_('Carga Horária (horas)'))

    # Configurações
    requires_practicum = models.BooleanField(default=False, verbose_name=_('Requer Prática'))
    minimum_passing_grade = models.FloatField(default=6.0, verbose_name=_('Nota Mínima'))

    class Meta:
        verbose_name = _('Disciplina')
        verbose_name_plural = _('Disciplinas')
        unique_together = ['school', 'code']
        indexes = [
            models.Index(fields=['school', 'is_active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

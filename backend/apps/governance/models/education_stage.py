from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class StageType(models.TextChoices):
    INFANTIL = 'INFANTIL', _('Educação Infantil')
    FUNDAMENTAL_I = 'FUNDAMENTAL_I', _('Fundamental — Anos Iniciais')
    FUNDAMENTAL_II = 'FUNDAMENTAL_II', _('Fundamental — Anos Finais')
    EJA = 'EJA', _('EJA')


class EvaluationType(models.TextChoices):
    NUMERIC = 'NUMERIC', _('Numérica')
    CONCEPT = 'CONCEPT', _('Conceito')
    DESCRIPTIVE = 'DESCRIPTIVE', _('Descritiva')


class EducationStage(BaseModel):
    """Etapa de ensino com tipo de avaliação (dado de referência da rede)."""

    name = models.CharField(max_length=100, verbose_name=_('Nome'))
    code = models.CharField(max_length=20, unique=True, verbose_name=_('Código'))
    stage_type = models.CharField(max_length=50, choices=StageType.choices, verbose_name=_('Tipo'))
    evaluation_type = models.CharField(
        max_length=30,
        choices=EvaluationType.choices,
        verbose_name=_('Tipo de Avaliação'),
    )

    class Meta:
        verbose_name = _('Etapa de Ensino')
        verbose_name_plural = _('Etapas de Ensino')
        ordering = ['name']

    def __str__(self):
        return self.name

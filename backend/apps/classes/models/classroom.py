from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class Classroom(BaseModel):
    """Modelo de Sala de Aula."""

    school = models.ForeignKey(
        'schools.School',
        on_delete=models.PROTECT,
        related_name='classrooms',
        verbose_name=_('Escola'),
    )

    number = models.CharField(max_length=20, verbose_name=_('Número/Identificação'))
    capacity = models.IntegerField(verbose_name=_('Capacidade'))
    floor = models.IntegerField(verbose_name=_('Andar'))
    building = models.CharField(max_length=50, blank=True, verbose_name=_('Bloco/Prédio'))

    # Recursos
    has_projector = models.BooleanField(default=False, verbose_name=_('Tem Projetor'))
    has_whiteboard = models.BooleanField(default=True, verbose_name=_('Tem Quadro Branco'))
    has_blackboard = models.BooleanField(default=False, verbose_name=_('Tem Quadro Negro'))
    has_air_conditioning = models.BooleanField(default=False, verbose_name=_('Tem Ar Condicionado'))
    has_wifi = models.BooleanField(default=False, verbose_name=_('Tem WiFi'))

    class Meta:
        verbose_name = _('Sala de Aula')
        verbose_name_plural = _('Salas de Aula')
        unique_together = ['school', 'number']
        indexes = [
            models.Index(fields=['school', 'is_active']),
        ]

    def __str__(self):
        return f"Sala {self.number}"

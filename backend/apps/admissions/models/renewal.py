from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class RenewalOutcome(models.TextChoices):
    PENDING = 'PENDING', _('Pendente')
    STAY = 'STAY', _('Permanece na mesma escola')
    INTERNAL_TRANSFER = 'INTERNAL_TRANSFER', _('Deseja transferência interna')
    NOT_RETURNING = 'NOT_RETURNING', _('Não retorna à rede')


class RenewalRequest(BaseModel):
    """Decisão de rematrícula de um aluno ativo para o ano de destino do ciclo."""

    cycle = models.ForeignKey(
        'admissions.AdmissionCycle',
        on_delete=models.CASCADE,
        related_name='renewal_requests',
        verbose_name=_('Ciclo'),
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='renewal_requests',
        verbose_name=_('Aluno'),
    )
    current_enrollment = models.ForeignKey(
        'students.Enrollment',
        on_delete=models.PROTECT,
        related_name='renewal_requests',
        verbose_name=_('Matrícula vigente'),
    )
    guardian = models.ForeignKey(
        'students.Guardian',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='renewal_confirmations',
        verbose_name=_('Responsável que confirmou'),
    )

    outcome = models.CharField(
        max_length=20,
        choices=RenewalOutcome.choices,
        default=RenewalOutcome.PENDING,
        verbose_name=_('Decisão'),
    )

    # snapshot cadastral informado na revisão
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name=_('Telefone'))
    residential_address = models.CharField(
        max_length=255, blank=True, verbose_name=_('Endereço residencial')
    )
    residential_lat = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, verbose_name=_('Latitude')
    )
    residential_lng = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, verbose_name=_('Longitude')
    )
    has_new_special_needs = models.BooleanField(
        default=False, verbose_name=_('Novo laudo / NEE')
    )
    special_needs_note = models.TextField(blank=True, verbose_name=_('Observação NEE'))

    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Confirmado em'))
    next_enrollment = models.ForeignKey(
        'students.Enrollment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='renewed_from',
        verbose_name=_('Matrícula do ano de destino'),
    )

    class Meta:
        verbose_name = _('Rematrícula')
        verbose_name_plural = _('Rematrículas')
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['cycle', 'student'], name='uq_renewal_cycle_student'
            ),
        ]
        indexes = [
            models.Index(fields=['cycle', 'outcome']),
        ]

    def __str__(self):
        return f'Rematrícula {self.student} — {self.get_outcome_display()}'

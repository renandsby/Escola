from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class AdmissionCycleStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Rascunho')
    RENEWAL_OPEN = 'RENEWAL_OPEN', _('Rematrícula aberta')
    RENEWAL_CLOSED = 'RENEWAL_CLOSED', _('Rematrícula encerrada')
    NEW_OPEN = 'NEW_OPEN', _('Novas matrículas abertas')
    NEW_CLOSED = 'NEW_CLOSED', _('Novas matrículas encerradas')
    PROCESSED = 'PROCESSED', _('Alocação processada')


#: transições permitidas (avanço linear)
_NEXT = {
    AdmissionCycleStatus.DRAFT: AdmissionCycleStatus.RENEWAL_OPEN,
    AdmissionCycleStatus.RENEWAL_OPEN: AdmissionCycleStatus.RENEWAL_CLOSED,
    AdmissionCycleStatus.RENEWAL_CLOSED: AdmissionCycleStatus.NEW_OPEN,
    AdmissionCycleStatus.NEW_OPEN: AdmissionCycleStatus.NEW_CLOSED,
    AdmissionCycleStatus.NEW_CLOSED: AdmissionCycleStatus.PROCESSED,
}


class AdmissionCycle(BaseModel):
    """Ciclo anual de admissão: janela de rematrícula seguida da de novas
    matrículas, para um ano letivo de destino."""

    education_department = models.ForeignKey(
        'governance.EducationDepartment',
        on_delete=models.PROTECT,
        related_name='admission_cycles',
        verbose_name=_('Secretaria'),
    )
    target_academic_year = models.ForeignKey(
        'governance.AcademicYear',
        on_delete=models.PROTECT,
        related_name='admission_cycles',
        verbose_name=_('Ano letivo de destino'),
    )
    name = models.CharField(max_length=120, verbose_name=_('Nome'))

    renewal_opens_at = models.DateTimeField(verbose_name=_('Rematrícula abre em'))
    renewal_closes_at = models.DateTimeField(verbose_name=_('Rematrícula fecha em'))
    new_request_opens_at = models.DateTimeField(verbose_name=_('Novas matrículas abrem em'))
    new_request_closes_at = models.DateTimeField(verbose_name=_('Novas matrículas fecham em'))

    status = models.CharField(
        max_length=20,
        choices=AdmissionCycleStatus.choices,
        default=AdmissionCycleStatus.DRAFT,
        verbose_name=_('Status'),
    )

    class Meta:
        verbose_name = _('Ciclo de Admissão')
        verbose_name_plural = _('Ciclos de Admissão')
        ordering = ['-target_academic_year__year']
        constraints = [
            models.UniqueConstraint(
                fields=['education_department', 'target_academic_year'],
                name='uq_admission_cycle_dept_year',
            ),
        ]

    def __str__(self):
        return f'{self.name} ({self.target_academic_year})'

    def clean(self):
        if self.renewal_closes_at <= self.renewal_opens_at:
            raise ValidationError({'renewal_closes_at': _('Deve ser posterior à abertura.')})
        if self.new_request_closes_at <= self.new_request_opens_at:
            raise ValidationError({'new_request_closes_at': _('Deve ser posterior à abertura.')})
        if self.new_request_opens_at < self.renewal_closes_at:
            raise ValidationError({
                'new_request_opens_at': _(
                    'As novas matrículas só podem abrir após o fim da rematrícula.'
                )
            })

    @property
    def next_status(self):
        return _NEXT.get(self.status)

    def is_renewal_open(self) -> bool:
        now = timezone.now()
        return (
            self.status == AdmissionCycleStatus.RENEWAL_OPEN
            and self.renewal_opens_at <= now <= self.renewal_closes_at
        )

    def is_new_request_open(self) -> bool:
        now = timezone.now()
        return (
            self.status == AdmissionCycleStatus.NEW_OPEN
            and self.new_request_opens_at <= now <= self.new_request_closes_at
        )

from django.db import models
from django.utils.translation import gettext_lazy as _

from core.fields import CPFField
from core.models import BaseModel


class RequestOrigin(models.TextChoices):
    NEW = 'NEW', _('Novo entrante')
    RENEWAL_TRANSFER = 'RENEWAL_TRANSFER', _('Transferência interna (rematrícula)')


class EnrollmentRequestStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Rascunho')
    SUBMITTED = 'SUBMITTED', _('Enviada')
    AWAITING_PROCESSING = 'AWAITING_PROCESSING', _('Aguardando processamento')
    # estados de alocação (V2): ALLOCATED / WAITLISTED / ACCEPTED / DECLINED / EXPIRED
    CANCELLED = 'CANCELLED', _('Cancelada')


class EvidenceKind(models.TextChoices):
    PCD = 'PCD', _('Pessoa com Deficiência')
    SIBLING = 'SIBLING', _('Irmão matriculado na unidade')
    SOCIAL_VULNERABILITY = 'SOCIAL_VULNERABILITY', _('Vulnerabilidade social (CadÚnico)')


class EvidenceStatus(models.TextChoices):
    PENDING = 'PENDING', _('Aguardando verificação')
    VERIFIED = 'VERIFIED', _('Verificada')
    REJECTED = 'REJECTED', _('Rejeitada')


class EnrollmentRequest(BaseModel):
    """Solicitação de matrícula (novo entrante ou transferência interna)."""

    cycle = models.ForeignKey(
        'admissions.AdmissionCycle',
        on_delete=models.CASCADE,
        related_name='enrollment_requests',
        verbose_name=_('Ciclo'),
    )
    guardian = models.ForeignKey(
        'students.Guardian',
        on_delete=models.PROTECT,
        related_name='enrollment_requests',
        verbose_name=_('Responsável'),
    )
    origin = models.CharField(
        max_length=20,
        choices=RequestOrigin.choices,
        default=RequestOrigin.NEW,
        verbose_name=_('Origem'),
    )
    renewal_request = models.OneToOneField(
        'admissions.RenewalRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transfer_request',
        verbose_name=_('Rematrícula de origem'),
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enrollment_requests',
        verbose_name=_('Aluno (se já cadastrado)'),
    )

    # identidade do candidato quando ainda não há Student
    applicant_name = models.CharField(max_length=200, blank=True, verbose_name=_('Nome do candidato'))
    applicant_cpf = CPFField(null=True, blank=True, verbose_name=_('CPF do candidato'))
    applicant_birth_date = models.DateField(null=True, blank=True, verbose_name=_('Data de nascimento'))
    applicant_mother_name = models.CharField(
        max_length=200, blank=True, verbose_name=_('Nome da mãe')
    )

    desired_shift = models.CharField(max_length=20, verbose_name=_('Turno desejado'))
    target_grade_label = models.CharField(max_length=80, verbose_name=_('Série pretendida'))

    residential_address = models.CharField(max_length=255, verbose_name=_('Endereço residencial'))
    residential_lat = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, verbose_name=_('Latitude')
    )
    residential_lng = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, verbose_name=_('Longitude')
    )

    status = models.CharField(
        max_length=25,
        choices=EnrollmentRequestStatus.choices,
        default=EnrollmentRequestStatus.DRAFT,
        verbose_name=_('Status'),
    )
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Enviada em'))
    lgpd_consent_record = models.ForeignKey(
        'governance.ConsentRecord',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enrollment_requests',
        verbose_name=_('Consentimento LGPD'),
    )

    # preenchidos pela alocação (V2)
    score_total = models.IntegerField(null=True, blank=True, verbose_name=_('Pontuação'))
    score_breakdown = models.JSONField(null=True, blank=True, verbose_name=_('Detalhe da pontuação'))

    class Meta:
        verbose_name = _('Solicitação de Matrícula')
        verbose_name_plural = _('Solicitações de Matrícula')
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['cycle', 'student'],
                condition=models.Q(student__isnull=False),
                name='uq_request_cycle_student',
            ),
            models.UniqueConstraint(
                fields=['cycle', 'applicant_cpf'],
                condition=models.Q(student__isnull=True, applicant_cpf__isnull=False),
                name='uq_request_cycle_applicant_cpf',
            ),
        ]
        indexes = [
            models.Index(fields=['cycle', 'status']),
        ]

    def __str__(self):
        who = self.student or self.applicant_name or self.applicant_cpf
        return f'Solicitação {who} ({self.get_status_display()})'

    @property
    def applicant_display(self):
        if self.student_id:
            return self.student.full_name
        return self.applicant_name


class SchoolPreference(BaseModel):
    request = models.ForeignKey(
        EnrollmentRequest,
        on_delete=models.CASCADE,
        related_name='preferences',
        verbose_name=_('Solicitação'),
    )
    rank = models.PositiveSmallIntegerField(verbose_name=_('Ordem de preferência'))
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.PROTECT,
        related_name='enrollment_preferences',
        verbose_name=_('Escola'),
    )

    class Meta:
        verbose_name = _('Preferência de Escola')
        verbose_name_plural = _('Preferências de Escola')
        ordering = ['rank']
        constraints = [
            models.UniqueConstraint(fields=['request', 'rank'], name='uq_preference_rank'),
            models.UniqueConstraint(fields=['request', 'school'], name='uq_preference_school'),
            models.CheckConstraint(
                condition=models.Q(rank__gte=1, rank__lte=3), name='ck_preference_rank_1_3'
            ),
        ]

    def __str__(self):
        return f'{self.rank}ª — {self.school}'


class PriorityEvidence(BaseModel):
    request = models.ForeignKey(
        EnrollmentRequest,
        on_delete=models.CASCADE,
        related_name='evidences',
        verbose_name=_('Solicitação'),
    )
    kind = models.CharField(max_length=25, choices=EvidenceKind.choices, verbose_name=_('Tipo'))
    declared_school = models.ForeignKey(
        'schools.School',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sibling_evidences',
        verbose_name=_('Escola do irmão'),
    )
    file = models.FileField(
        upload_to='admissions/evidence/%Y/%m/', verbose_name=_('Comprovante')
    )
    file_name = models.CharField(max_length=255, verbose_name=_('Nome do arquivo'))

    status = models.CharField(
        max_length=15,
        choices=EvidenceStatus.choices,
        default=EvidenceStatus.PENDING,
        verbose_name=_('Situação'),
    )
    verified_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_evidences',
        verbose_name=_('Verificado por'),
    )
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Verificado em'))
    review_note = models.TextField(blank=True, verbose_name=_('Parecer'))

    class Meta:
        verbose_name = _('Comprovante de Prioridade')
        verbose_name_plural = _('Comprovantes de Prioridade')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'kind']),
        ]

    def __str__(self):
        return f'{self.get_kind_display()} — {self.get_status_display()}'

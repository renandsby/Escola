from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import SoftDeleteModel


class EnrollmentStatus(models.TextChoices):
    ENROLLED = 'ENROLLED', _('Matriculado')
    APPROVED = 'APPROVED', _('Aprovado')
    FAILED_ACADEMIC = 'FAILED_ACADEMIC', _('Reprovado por nota')
    FAILED_ATTENDANCE = 'FAILED_ATTENDANCE', _('Reprovado por frequência')
    TRANSFERRED_INTERNAL = 'TRANSFERRED_INTERNAL', _('Transferido (interno)')
    TRANSFERRED_EXTERNAL = 'TRANSFERRED_EXTERNAL', _('Transferido (externo)')
    DROPOUT = 'DROPOUT', _('Desistente')
    DECEASED = 'DECEASED', _('Falecido')


class Enrollment(SoftDeleteModel):
    """Matrícula anual do aluno em uma turma."""

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.PROTECT,
        related_name='enrollments',
        verbose_name=_('Aluno'),
    )
    school_class = models.ForeignKey(
        'classes.SchoolClass',
        on_delete=models.PROTECT,
        related_name='enrollments',
        verbose_name=_('Turma'),
    )
    academic_year = models.ForeignKey(
        'governance.AcademicYear',
        on_delete=models.PROTECT,
        related_name='enrollments',
        null=True,
        verbose_name=_('Ano Letivo'),
    )
    enrollment_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_('Número da matrícula'),
    )
    enrollment_date = models.DateField(auto_now_add=True, verbose_name=_('Data de Matrícula'))
    status = models.CharField(
        max_length=30,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.ENROLLED,
        verbose_name=_('Status'),
    )

    class Meta:
        verbose_name = _('Matrícula')
        verbose_name_plural = _('Matrículas')
        indexes = [
            models.Index(fields=['student', 'school_class']),
            models.Index(fields=['student', 'status']),
            models.Index(fields=['school_class', 'status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'academic_year'],
                condition=models.Q(status='ENROLLED', deleted_at__isnull=True),
                name='uniq_active_enrollment_per_year',
            ),
        ]

    def __str__(self):
        return f"{self.enrollment_number} — {self.student}"

    @property
    def class_obj(self):
        """Compatibilidade com código legado."""
        return self.school_class

    @property
    def school(self):
        return self.school_class.school


class TransferRequestStatus(models.TextChoices):
    PENDING_SME = 'PENDING_SME', _('Pendente SME')
    APPROVED_BY_SME = 'APPROVED_BY_SME', _('Aprovada pela SME')
    ACCEPTED_BY_DESTINATION = 'ACCEPTED_BY_DESTINATION', _('Aceita pelo destino')
    REJECTED = 'REJECTED', _('Rejeitada')
    CANCELLED = 'CANCELLED', _('Cancelada')


class TransferRequest(SoftDeleteModel):
    """Solicitação de transferência / central de vagas."""

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.PROTECT,
        related_name='transfer_requests',
        verbose_name=_('Aluno'),
    )
    origin_school = models.ForeignKey(
        'schools.School',
        on_delete=models.PROTECT,
        related_name='outgoing_transfers',
        verbose_name=_('Escola de origem'),
    )
    destination_school = models.ForeignKey(
        'schools.School',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='incoming_transfers',
        verbose_name=_('Escola de destino'),
    )
    academic_year = models.ForeignKey(
        'governance.AcademicYear',
        on_delete=models.PROTECT,
        related_name='transfer_requests',
        verbose_name=_('Ano Letivo'),
    )
    reason = models.TextField(verbose_name=_('Motivo'))
    status = models.CharField(
        max_length=30,
        choices=TransferRequestStatus.choices,
        default=TransferRequestStatus.PENDING_SME,
        verbose_name=_('Status'),
    )
    target_enrollment = models.ForeignKey(
        'students.Enrollment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='originating_transfer',
        verbose_name=_('Matrícula de destino'),
    )
    requested_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Solicitado em'))
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Resolvido em'))

    class Meta:
        verbose_name = _('Solicitação de Transferência')
        verbose_name_plural = _('Solicitações de Transferência')
        ordering = ['-requested_at']

    def __str__(self):
        return f"Transferência {self.student} ({self.get_status_display()})"

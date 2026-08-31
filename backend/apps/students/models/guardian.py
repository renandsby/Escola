import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _
from core.fields import CPFField
from core.models import SoftDeleteModel


class KinshipType(models.TextChoices):
    MOTHER = 'MOTHER', _('Mãe')
    FATHER = 'FATHER', _('Pai')
    LEGAL_GUARDIAN = 'LEGAL_GUARDIAN', _('Responsável legal')
    GRANDPARENT = 'GRANDPARENT', _('Avô/Avó')
    OTHER = 'OTHER', _('Outro')


class GuardianLinkStatus(models.TextChoices):
    PENDING = 'PENDING', _('Aguardando confirmação da escola')
    CONFIRMED = 'CONFIRMED', _('Confirmado')
    REJECTED = 'REJECTED', _('Recusado')


class GuardianLinkMethod(models.TextChoices):
    STAFF_CREATED = 'STAFF_CREATED', _('Criado pela equipe')
    SCHOOL_APPROVAL = 'SCHOOL_APPROVAL', _('Solicitado pelo responsável, aprovado pela escola')
    LINK_CODE = 'LINK_CODE', _('Confirmado por código de vinculação')


class Guardian(SoftDeleteModel):
    """Responsável — pode existir sem login."""

    user = models.OneToOneField(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='guardian_profile',
        verbose_name=_('Usuário'),
    )
    full_name = models.CharField(max_length=200, verbose_name=_('Nome completo'))
    cpf = CPFField(unique=True, verbose_name=_('CPF'))
    phone = models.CharField(max_length=20, verbose_name=_('Telefone'))
    email = models.EmailField(blank=True, verbose_name=_('Email'))
    address = models.CharField(max_length=255, blank=True, verbose_name=_('Endereço'))
    occupation = models.CharField(max_length=100, blank=True, verbose_name=_('Ocupação'))

    class Meta:
        verbose_name = _('Responsável')
        verbose_name_plural = _('Responsáveis')
        indexes = [
            models.Index(fields=['cpf']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.full_name


class StudentGuardian(models.Model):
    """Vínculo aluno–responsável com parentesco e contato de emergência."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='guardian_links',
        verbose_name=_('Aluno'),
    )
    guardian = models.ForeignKey(
        Guardian,
        on_delete=models.CASCADE,
        related_name='student_links',
        verbose_name=_('Responsável'),
    )
    kinship_type = models.CharField(
        max_length=50,
        choices=KinshipType.choices,
        verbose_name=_('Parentesco'),
    )
    is_emergency_contact = models.BooleanField(default=True, verbose_name=_('Contato de emergência'))

    # DX-SGE-006 — o vínculo só dá acesso à vida escolar quando CONFIRMED
    status = models.CharField(
        max_length=15,
        choices=GuardianLinkStatus.choices,
        default=GuardianLinkStatus.CONFIRMED,
        verbose_name=_('Situação'),
    )
    verification_method = models.CharField(
        max_length=20,
        choices=GuardianLinkMethod.choices,
        default=GuardianLinkMethod.STAFF_CREATED,
        verbose_name=_('Forma de verificação'),
    )
    requested_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requested_guardian_links',
        verbose_name=_('Solicitado por'),
    )
    confirmed_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_guardian_links',
        verbose_name=_('Confirmado por'),
    )
    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Confirmado em'))
    rejection_note = models.TextField(blank=True, verbose_name=_('Motivo da recusa'))

    class Meta:
        verbose_name = _('Vínculo Aluno-Responsável')
        verbose_name_plural = _('Vínculos Aluno-Responsável')
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'guardian'],
                name='uq_student_guardian',
            ),
        ]
        indexes = [
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.guardian} → {self.student} ({self.get_kinship_type_display()})"


class GuardianLinkCode(SoftDeleteModel):
    """Código de uso único gerado pela equipe para o responsável confirmar o
    vínculo com um aluno específico sem triagem manual (DX-SGE-006, caminho B)."""

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='link_codes',
        verbose_name=_('Aluno'),
    )
    code_hash = models.CharField(max_length=64, verbose_name=_('Hash do código'))
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_link_codes',
        verbose_name=_('Gerado por'),
    )
    kinship_hint = models.CharField(
        max_length=50,
        blank=True,
        choices=KinshipType.choices,
        verbose_name=_('Parentesco sugerido'),
    )
    expires_at = models.DateTimeField(verbose_name=_('Expira em'))
    used = models.BooleanField(default=False, verbose_name=_('Utilizado'))
    used_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='redeemed_link_codes',
        verbose_name=_('Resgatado por'),
    )
    used_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Resgatado em'))

    class Meta:
        verbose_name = _('Código de Vinculação')
        verbose_name_plural = _('Códigos de Vinculação')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code_hash', 'used']),
        ]

    def __str__(self):
        return f"Código para {self.student} ({'usado' if self.used else 'ativo'})"

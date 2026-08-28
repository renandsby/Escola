import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import SoftDeleteModel


class KinshipType(models.TextChoices):
    MOTHER = 'MOTHER', _('Mãe')
    FATHER = 'FATHER', _('Pai')
    LEGAL_GUARDIAN = 'LEGAL_GUARDIAN', _('Responsável legal')
    GRANDPARENT = 'GRANDPARENT', _('Avô/Avó')
    OTHER = 'OTHER', _('Outro')


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
    cpf = models.CharField(max_length=11, unique=True, verbose_name=_('CPF'))
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

    class Meta:
        verbose_name = _('Vínculo Aluno-Responsável')
        verbose_name_plural = _('Vínculos Aluno-Responsável')
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'guardian'],
                name='uq_student_guardian',
            ),
        ]

    def __str__(self):
        return f"{self.guardian} → {self.student} ({self.get_kinship_type_display()})"

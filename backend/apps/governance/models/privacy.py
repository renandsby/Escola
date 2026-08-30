from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class ConsentType(models.TextChoices):
    """Bases de tratamento que exigem consentimento explícito do titular."""

    ENROLLMENT_DATA_USE = 'MATRICULA_USO_DADOS', _(
        'Uso de dados pessoais para matrícula e gestão escolar'
    )
    IMAGE_USE = 'USO_IMAGEM', _('Uso de imagem em materiais institucionais')
    COMMUNICATION = 'COMUNICACAO', _('Comunicações da rede por e-mail e telefone')


# Versão corrente dos termos apresentados ao titular — bump manual a cada revisão.
CURRENT_TERM_VERSION = '1.0'


class ConsentRecord(BaseModel):
    """Registro imutável de consentimento LGPD para um aluno (art. 8º, §1º)."""

    user = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consent_records',
        verbose_name=_('Usuário que registrou'),
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='consent_records',
        verbose_name=_('Aluno titular'),
    )
    consent_type = models.CharField(
        max_length=32,
        choices=ConsentType.choices,
        verbose_name=_('Tipo de consentimento'),
    )
    granted = models.BooleanField(default=True, verbose_name=_('Concedido'))
    term_version = models.CharField(
        max_length=20,
        default=CURRENT_TERM_VERSION,
        verbose_name=_('Versão do termo'),
    )
    granted_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Registrado em'))
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, verbose_name=_('IP de origem')
    )

    class Meta:
        verbose_name = _('Registro de consentimento')
        verbose_name_plural = _('Registros de consentimento')
        ordering = ['-granted_at']
        indexes = [
            models.Index(fields=['student', 'consent_type']),
        ]

    def __str__(self):
        estado = 'concedido' if self.granted else 'revogado'
        return f'{self.get_consent_type_display()} — {estado} ({self.student_id})'

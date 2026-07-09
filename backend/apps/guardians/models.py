from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel, User


class Guardian(BaseModel):
    """Modelo de Responsável - Pai/Mãe/Tutor de aluno."""

    RELATIONSHIP_CHOICES = [
        ('mother', _('Mãe')),
        ('father', _('Pai')),
        ('guardian', _('Tutor')),
        ('other', _('Outro')),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='guardian_profile',
        verbose_name=_('Usuário'),
    )
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='guardians',
        verbose_name=_('Escola'),
    )
    students = models.ManyToManyField(
        'students.Student',
        related_name='guardians',
        verbose_name=_('Alunos'),
    )

    # Informações pessoais
    cpf = models.CharField(max_length=14, blank=True, verbose_name=_('CPF'))
    relationship = models.CharField(
        max_length=20,
        choices=RELATIONSHIP_CHOICES,
        verbose_name=_('Parentesco'),
    )
    occupation = models.CharField(max_length=100, blank=True, verbose_name=_('Ocupação'))

    # Contato
    alternate_phone = models.CharField(max_length=20, blank=True, verbose_name=_('Telefone Alternativo'))
    work_phone = models.CharField(max_length=20, blank=True, verbose_name=_('Telefone Comercial'))

    # Endereço
    address = models.CharField(max_length=255, blank=True, verbose_name=_('Endereço'))
    address_number = models.CharField(max_length=10, blank=True, verbose_name=_('Número'))
    complement = models.CharField(max_length=255, blank=True, verbose_name=_('Complemento'))
    city = models.CharField(max_length=100, blank=True, verbose_name=_('Cidade'))
    state = models.CharField(max_length=2, blank=True, verbose_name=_('Estado'))
    zip_code = models.CharField(max_length=10, blank=True, verbose_name=_('CEP'))

    class Meta:
        verbose_name = _('Responsável')
        verbose_name_plural = _('Responsáveis')
        indexes = [
            models.Index(fields=['school', 'is_active']),
            models.Index(fields=['cpf']),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.get_relationship_display()})"

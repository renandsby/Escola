from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel, User


class Teacher(BaseModel):
    """Modelo de Professor."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='teacher_profile',
        verbose_name=_('Usuário'),
    )
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='teachers',
        verbose_name=_('Escola'),
    )

    registration_number = models.CharField(max_length=20, unique=True, verbose_name=_('Matrícula'))
    cpf = models.CharField(max_length=14, unique=True, verbose_name=_('CPF'))
    birth_date = models.DateField(verbose_name=_('Data de Nascimento'))

    # Formação
    academic_degree = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_('Formação Acadêmica'),
    )
    specialization = models.CharField(max_length=100, blank=True, verbose_name=_('Especialização'))

    # Emprego
    hiring_date = models.DateField(auto_now_add=True, verbose_name=_('Data de Contratação'))
    employment_status = models.CharField(
        max_length=20,
        choices=[('active', _('Ativo')), ('inactive', _('Inativo')), ('on_leave', _('De Licença'))],
        default='active',
        verbose_name=_('Status'),
    )

    class Meta:
        verbose_name = _('Professor')
        verbose_name_plural = _('Professores')
        indexes = [
            models.Index(fields=['school', 'employment_status']),
            models.Index(fields=['cpf']),
        ]

    def __str__(self):
        return f"Prof. {self.user.get_full_name()}"

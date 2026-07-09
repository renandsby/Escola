from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel, User


class Student(BaseModel):
    """Modelo de Aluno - Estudante matriculado na escola."""

    GENDER_CHOICES = [
        ('M', _('Masculino')),
        ('F', _('Feminino')),
        ('O', _('Outro')),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student_profile',
        verbose_name=_('Usuário'),
    )
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='students',
        verbose_name=_('Escola'),
    )

    # Informações pessoais
    registration_number = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_('Matrícula'),
    )
    birth_date = models.DateField(verbose_name=_('Data de Nascimento'))
    gender = models.CharField(
        max_length=1,
        choices=GENDER_CHOICES,
        verbose_name=_('Gênero'),
    )
    nationality = models.CharField(max_length=50, blank=True, verbose_name=_('Nacionalidade'))
    place_of_birth = models.CharField(max_length=100, blank=True, verbose_name=_('Local de Nascimento'))

    # Documentos
    cpf = models.CharField(max_length=14, blank=True, verbose_name=_('CPF'))
    rg = models.CharField(max_length=20, blank=True, verbose_name=_('RG'))
    birth_certificate = models.CharField(max_length=50, blank=True, verbose_name=_('Certidão de Nascimento'))

    # Informações de matrícula
    enrollment_date = models.DateField(auto_now_add=True, verbose_name=_('Data de Matrícula'))
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', _('Ativo')),
            ('inactive', _('Inativo')),
            ('transferred', _('Transferido')),
            ('dropped', _('Desistente')),
        ],
        default='active',
        verbose_name=_('Status'),
    )

    # Informações adicionais
    needs_special_attention = models.BooleanField(
        default=False,
        verbose_name=_('Necessita Atenção Especial'),
    )
    notes = models.TextField(blank=True, verbose_name=_('Observações'))

    class Meta:
        verbose_name = _('Aluno')
        verbose_name_plural = _('Alunos')
        unique_together = ['school', 'registration_number']
        indexes = [
            models.Index(fields=['school', 'status']),
            models.Index(fields=['registration_number']),
            models.Index(fields=['cpf']),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.registration_number})"

    def get_age(self):
        """Calcula a idade do aluno."""
        from datetime import date
        today = date.today()
        return today.year - self.birth_date.year - (
            (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
        )

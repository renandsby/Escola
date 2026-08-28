from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import SoftDeleteModel


class Student(SoftDeleteModel):
    """Cadastro único municipal do estudante."""

    GENDER_CHOICES = [
        ('M', _('Masculino')),
        ('F', _('Feminino')),
        ('O', _('Outro')),
    ]

    education_department = models.ForeignKey(
        'governance.EducationDepartment',
        on_delete=models.PROTECT,
        related_name='students',
        verbose_name=_('Secretaria'),
    )
    user = models.OneToOneField(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_profile',
        verbose_name=_('Usuário (login opcional)'),
    )
    unique_municipal_id = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_('Identificador municipal único'),
    )
    inep_id = models.CharField(
        max_length=12,
        unique=True,
        null=True,
        blank=True,
        verbose_name=_('ID INEP'),
    )
    full_name = models.CharField(max_length=200, verbose_name=_('Nome completo'))
    social_name = models.CharField(max_length=200, blank=True, verbose_name=_('Nome social'))
    cpf = models.CharField(max_length=11, unique=True, null=True, blank=True, verbose_name=_('CPF'))
    birth_certificate = models.CharField(max_length=50, blank=True, verbose_name=_('Certidão de Nascimento'))
    nis_code = models.CharField(max_length=15, blank=True, verbose_name=_('NIS'))
    birth_date = models.DateField(verbose_name=_('Data de Nascimento'))
    gender = models.CharField(max_length=20, blank=True, choices=GENDER_CHOICES, verbose_name=_('Gênero'))
    race_color = models.CharField(max_length=30, blank=True, verbose_name=_('Raça/Cor'))
    mother_name = models.CharField(max_length=200, verbose_name=_('Nome da mãe'))
    father_name = models.CharField(max_length=200, blank=True, verbose_name=_('Nome do pai'))
    has_special_needs = models.BooleanField(default=False, verbose_name=_('Necessidades especiais'))
    special_needs_details = models.TextField(blank=True, verbose_name=_('Detalhes NEE'))
    notes = models.TextField(blank=True, verbose_name=_('Observações'))

    class Meta:
        verbose_name = _('Aluno')
        verbose_name_plural = _('Alunos')
        indexes = [
            models.Index(fields=['education_department', 'is_active']),
            models.Index(fields=['unique_municipal_id']),
            models.Index(fields=['cpf']),
            models.Index(fields=['inep_id']),
            models.Index(fields=['full_name']),
            models.Index(fields=['mother_name']),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.unique_municipal_id})"

    def get_age(self):
        from datetime import date

        today = date.today()
        return today.year - self.birth_date.year - (
            (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
        )

    @property
    def registration_number(self):
        """Compatibilidade com código legado / relatórios."""
        return self.unique_municipal_id

    def delete(self, using=None, keep_parents=False):
        self.soft_delete()

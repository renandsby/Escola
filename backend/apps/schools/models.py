from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import SoftDeleteModel


class SchoolType(models.TextChoices):
    CRECHE = 'CRECHE', _('Creche')
    PRE_ESCOLA = 'PRE_ESCOLA', _('Pré-escola')
    FUNDAMENTAL_1 = 'FUNDAMENTAL_1', _('Fundamental I')
    FUNDAMENTAL_2 = 'FUNDAMENTAL_2', _('Fundamental II')
    EJA = 'EJA', _('EJA')
    MISTA = 'MISTA', _('Mista')


class School(SoftDeleteModel):
    """Unidade escolar subordinada à SME."""

    education_department = models.ForeignKey(
        'governance.EducationDepartment',
        on_delete=models.PROTECT,
        related_name='schools',
        verbose_name=_('Secretaria Municipal'),
    )
    inep_code = models.CharField(
        max_length=8,
        unique=True,
        null=True,
        blank=True,
        verbose_name=_('Código INEP'),
    )
    name = models.CharField(max_length=200, verbose_name=_('Nome da Escola'))
    cnpj = models.CharField(max_length=14, unique=True, null=True, blank=True, verbose_name=_('CNPJ'))
    school_type = models.CharField(
        max_length=50,
        choices=SchoolType.choices,
        verbose_name=_('Tipo de Escola'),
    )
    director_user = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='directed_schools',
        verbose_name=_('Diretor'),
    )
    email = models.EmailField(blank=True, verbose_name=_('Email'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('Telefone'))
    website = models.URLField(blank=True, verbose_name=_('Website'))

    address_street = models.CharField(max_length=255, blank=True, verbose_name=_('Logradouro'))
    address_number = models.CharField(max_length=20, blank=True, verbose_name=_('Número'))
    address_neighborhood = models.CharField(max_length=100, blank=True, verbose_name=_('Bairro'))
    address_city = models.CharField(max_length=100, blank=True, verbose_name=_('Cidade'))
    address_state = models.CharField(max_length=2, blank=True, verbose_name=_('UF'))
    address_zip_code = models.CharField(max_length=8, blank=True, verbose_name=_('CEP'))

    max_students_per_class = models.IntegerField(
        default=30,
        verbose_name=_('Máximo de Alunos por Turma'),
    )

    class Meta:
        verbose_name = _('Escola')
        verbose_name_plural = _('Escolas')
        indexes = [
            models.Index(fields=['education_department']),
            models.Index(fields=['inep_code']),
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name

    def delete(self, using=None, keep_parents=False):
        """Soft delete por padrão — evita CASCADE destrutivo."""
        self.soft_delete()

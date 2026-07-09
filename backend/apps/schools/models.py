from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class School(BaseModel):
    """Modelo de Escola - Entidade principal do sistema."""

    name = models.CharField(max_length=255, verbose_name=_('Nome da Escola'))
    cnpj = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_('CNPJ'),
    )
    email = models.EmailField(verbose_name=_('Email'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('Telefone'))
    website = models.URLField(blank=True, verbose_name=_('Website'))

    # Endereço
    address = models.CharField(max_length=255, blank=True, verbose_name=_('Endereço'))
    address_number = models.CharField(max_length=10, blank=True, verbose_name=_('Número'))
    complement = models.CharField(max_length=255, blank=True, verbose_name=_('Complemento'))
    city = models.CharField(max_length=100, blank=True, verbose_name=_('Cidade'))
    state = models.CharField(max_length=2, blank=True, verbose_name=_('Estado'))
    zip_code = models.CharField(max_length=10, blank=True, verbose_name=_('CEP'))

    # Informações administrativas
    founded_year = models.IntegerField(null=True, blank=True, verbose_name=_('Ano de Fundação'))
    director_name = models.CharField(max_length=255, blank=True, verbose_name=_('Diretor'))
    secretary_email = models.EmailField(blank=True, verbose_name=_('Email Secretaria'))

    # Configurações
    max_students_per_class = models.IntegerField(
        default=40,
        verbose_name=_('Máximo de Alunos por Turma'),
    )
    school_year_start = models.IntegerField(default=1, verbose_name=_('Início do Ano Letivo (mês)'))
    school_year_end = models.IntegerField(default=12, verbose_name=_('Fim do Ano Letivo (mês)'))

    class Meta:
        verbose_name = _('Escola')
        verbose_name_plural = _('Escolas')
        indexes = [
            models.Index(fields=['cnpj']),
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name

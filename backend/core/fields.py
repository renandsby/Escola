"""Campos de model reutilizáveis."""

from __future__ import annotations

from django.db import models
from django.utils.translation import gettext_lazy as _

from core.validators import normalize_cpf, validate_cpf


class CPFField(models.CharField):
    """``CharField`` de 11 dígitos que normaliza o valor (remove máscara) antes
    de salvar e valida os dígitos verificadores em ``full_clean``.

    Não define ``unique`` — quem usa decide (``unique=True`` simples ou
    ``UniqueConstraint`` condicional para modelos com soft-delete).
    """

    description = _('CPF (11 dígitos)')

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 11)
        kwargs.setdefault('verbose_name', _('CPF'))
        validators = list(kwargs.pop('validators', []))
        if validate_cpf not in validators:
            validators.append(validate_cpf)
        kwargs['validators'] = validators
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        # os defaults são reaplicados no __init__ — não precisam ir na migração
        if kwargs.get('max_length') == 11:
            kwargs.pop('max_length', None)
        kwargs.pop('validators', None)
        return name, path, args, kwargs

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value in (None, ''):
            return value
        return normalize_cpf(value)

    def pre_save(self, model_instance, add):
        value = super().pre_save(model_instance, add)
        normalized = normalize_cpf(value) if value not in (None, '') else value
        if normalized != value:
            setattr(model_instance, self.attname, normalized)
        return normalized

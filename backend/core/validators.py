"""Validação e normalização de CPF — fonte única (DX-SGE-003/2026).

O CPF é o identificador principal de usuários e alunos. É sempre **persistido
como 11 dígitos** (sem máscara); a formatação ``000.000.000-00`` é só de
apresentação.
"""

from __future__ import annotations

import itertools
import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

_NON_DIGITS = re.compile(r'\D')


def normalize_cpf(value: str | None) -> str | None:
    """Remove máscara/espaços e devolve 11 dígitos (``zfill`` para CPFs com zero
    à esquerda). ``None``/vazio passam adiante inalterados."""
    if value is None:
        return None
    digits = _NON_DIGITS.sub('', str(value))
    if not digits:
        return ''
    if len(digits) == 10:  # CPF que perdeu o zero à esquerda
        digits = digits.zfill(11)
    return digits


def cpf_check_digit(digits: list[int]) -> int:
    """Dígito verificador para os ``digits`` informados (9 ou 10 posições)."""
    weights = range(len(digits) + 1, 1, -1)
    total = sum(d * w for d, w in zip(digits, weights))
    remainder = total % 11
    return 0 if remainder < 2 else 11 - remainder


def is_valid_cpf(value: str | None) -> bool:
    """True se ``value`` (com ou sem máscara) é um CPF com dígitos verificadores
    corretos e não é uma sequência repetida (``111.111.111-11`` etc.)."""
    digits = normalize_cpf(value) or ''
    if len(digits) != 11 or not digits.isdigit():
        return False
    if digits == digits[0] * 11:
        return False
    nums = [int(c) for c in digits]
    return (
        cpf_check_digit(nums[:9]) == nums[9]
        and cpf_check_digit(nums[:10]) == nums[10]
    )


def validate_cpf(value: str | None) -> None:
    """Validator de model/serializer — levanta ``ValidationError`` se inválido."""
    if not is_valid_cpf(value):
        raise ValidationError(
            _('CPF inválido. Informe um CPF válido (11 dígitos).'),
            code='invalid_cpf',
        )


def generate_cpf(seq: int = 0) -> str:
    """CPF sintético **com dígitos verificadores válidos** — para seeds e
    factories de teste. Determinístico e único por ``seq`` (mapa bijetivo
    ``mod 1e9`` com passo coprimo, para os 9 dígitos base ficarem bem
    distribuídos e não parecerem sequenciais)."""
    base_seed = (abs(int(seq)) * 982_451_653 + 123_456_789) % 1_000_000_000
    base = [int(c) for c in f'{base_seed:09d}']
    if len(set(base)) == 1:  # evita sequência repetida
        base[0] = (base[0] + 1) % 10
    d1 = cpf_check_digit(base)
    d2 = cpf_check_digit([*base, d1])
    return ''.join(str(d) for d in [*base, d1, d2])


_generated_cpf_seq = itertools.count(1)


def next_generated_cpf() -> str:
    """CPF válido e único no processo — para factories de teste e seeds.

    Usa um contador global, então diferentes factories no mesmo run de testes
    nunca colidem.
    """
    return generate_cpf(next(_generated_cpf_seq))


def format_cpf(value: str | None) -> str:
    """``000.000.000-00`` para apresentação; devolve o valor cru se não tiver
    11 dígitos."""
    digits = normalize_cpf(value) or ''
    if len(digits) != 11:
        return value or ''
    return f'{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}'

"""Validação e normalização de CPF (DX-SGE-003/2026 — Fase 1)."""

import pytest
from django.core.exceptions import ValidationError

from core.validators import (
    format_cpf,
    generate_cpf,
    is_valid_cpf,
    normalize_cpf,
    validate_cpf,
)


class TestNormalizeCPF:
    def test_strips_mask(self):
        assert normalize_cpf('529.982.247-25') == '52998224725'

    def test_pads_leading_zero(self):
        assert normalize_cpf('1234567890') == '01234567890'

    def test_none_and_blank(self):
        assert normalize_cpf(None) is None
        assert normalize_cpf('') == ''


class TestIsValidCPF:
    def test_accepts_valid_with_and_without_mask(self):
        assert is_valid_cpf('529.982.247-25')
        assert is_valid_cpf('52998224725')

    def test_rejects_wrong_check_digits(self):
        assert not is_valid_cpf('52998224724')

    def test_rejects_repeated_sequence(self):
        assert not is_valid_cpf('11111111111')

    def test_rejects_wrong_length(self):
        assert not is_valid_cpf('123')


class TestValidateCPF:
    def test_raises_on_invalid(self):
        with pytest.raises(ValidationError):
            validate_cpf('12345678900')

    def test_passes_on_valid(self):
        validate_cpf('529.982.247-25')


class TestGenerateCPF:
    def test_output_is_valid(self):
        for seq in range(0, 500, 7):
            cpf = generate_cpf(seq)
            assert len(cpf) == 11
            assert is_valid_cpf(cpf), cpf

    def test_distinct_per_seq(self):
        values = {generate_cpf(i) for i in range(200)}
        assert len(values) == 200


class TestFormatCPF:
    def test_formats_11_digits(self):
        assert format_cpf('52998224725') == '529.982.247-25'

    def test_passthrough_when_not_11(self):
        assert format_cpf('123') == '123'

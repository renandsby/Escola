"""Throttles com escopo nomeado (DX-SGE-006).

As taxas ficam em ``settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']``.
"""

from rest_framework.throttling import ScopedRateThrottle


class GuardianRegisterThrottle(ScopedRateThrottle):
    """Auto-cadastro público de responsável."""

    scope = 'guardian_register'


class FindStudentThrottle(ScopedRateThrottle):
    """Busca/solicitação de vínculo por CPF do aluno."""

    scope = 'find_student'

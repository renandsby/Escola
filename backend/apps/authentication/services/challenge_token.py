"""Challenge token — JWT temporário do login em dois passos (2FA).

Emitido pelo ``/api/v1/accounts/login/`` quando o usuário tem 2FA ativo, após a
validação de usuário/senha. Vale 5 minutos e só serve para trocar por um par
``access``/``refresh`` no ``/api/v1/accounts/totp/verify/``.
"""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import Token

from core.exceptions import BusinessLogicError

User = get_user_model()

CHALLENGE_TOKEN_LIFETIME = timedelta(minutes=5)


class ChallengeToken(Token):
    """JWT de curta duração para o desafio 2FA."""

    token_type = 'challenge'  # noqa: S105 - nome do tipo, não credencial
    lifetime = CHALLENGE_TOKEN_LIFETIME


def generate_challenge_token(user) -> str:
    token = ChallengeToken.for_user(user)
    token['username'] = user.username
    return str(token)


def resolve_challenge_token(token_str: str):
    """Decodifica o token e devolve o ``User`` ativo correspondente."""
    try:
        token = ChallengeToken(token_str)
    except TokenError as exc:
        raise BusinessLogicError(
            code='INVALID_CHALLENGE_TOKEN',
            message='Sessão de verificação expirada. Faça login novamente.',
        ) from exc

    user = User.objects.filter(id=token.get('user_id'), is_active=True).first()
    if user is None:
        raise BusinessLogicError(
            code='INVALID_CHALLENGE_TOKEN',
            message='Sessão de verificação inválida. Faça login novamente.',
        )
    return user

"""Backend de autenticação por CPF **ou** e-mail (DX-SGE-003/2026 — Fase 2).

O usuário faz login com o CPF (com ou sem máscara) ou com o e-mail. O
``username`` legado continua aceito para retrocompatibilidade.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

from core.validators import normalize_cpf

UserModel = get_user_model()


class CPFOrEmailBackend(ModelBackend):
    """Resolve o usuário por CPF, e-mail ou username e delega a checagem de
    senha/estado ao ``ModelBackend``."""

    def authenticate(self, request, username=None, password=None, identifier=None, **kwargs):
        ident = identifier or username or kwargs.get(UserModel.USERNAME_FIELD)
        if ident is None or password is None:
            return None
        ident = str(ident).strip()

        user = self._lookup(ident)
        if user is None:
            # roda o hasher mesmo sem usuário — mitiga enumeração por timing
            UserModel().set_password(password)
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    @staticmethod
    def _lookup(ident: str):
        digits = normalize_cpf(ident) or ''
        query = {}
        if len(digits) == 11 and digits.isdigit():
            query = {'cpf': digits}
        elif '@' in ident:
            query = {'email__iexact': ident}
        else:
            query = {'username__iexact': ident}
        try:
            return UserModel.objects.get(**query)
        except (UserModel.DoesNotExist, UserModel.MultipleObjectsReturned):
            return None

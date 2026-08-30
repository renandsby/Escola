"""URL assinada e curta para download de relatório (§3.6 — nunca MEDIA_URL público)."""

from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

_SALT = 'reports.download'
MAX_AGE_SECONDS = 300  # 5 minutos


def make_token(execution_id: str) -> str:
    return TimestampSigner(salt=_SALT).sign(str(execution_id))


def read_token(token: str) -> str | None:
    try:
        return TimestampSigner(salt=_SALT).unsign(token, max_age=MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None

"""Validação de upload reutilizável — extensão, assinatura real (magic bytes),
tamanho e sanitização de nome. Sem dependência de ``libmagic``.
"""

from __future__ import annotations

import os
import re
import unicodedata

from core.exceptions import BusinessLogicError

DEFAULT_MAX_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

# extensão -> assinaturas aceitas no início do arquivo
SIGNATURES: dict[str, tuple[bytes, ...]] = {
    'pdf': (b'%PDF-',),
    'png': (b'\x89PNG\r\n\x1a\n',),
    'jpg': (b'\xff\xd8\xff',),
    'jpeg': (b'\xff\xd8\xff',),
    'docx': (b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08'),
}
DEFAULT_ALLOWED = tuple(SIGNATURES)


def sanitize_filename(name: str) -> str:
    name = os.path.basename(name or 'arquivo')
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    name = re.sub(r'[^A-Za-z0-9._-]+', '_', name).strip('._')
    return name or 'arquivo'


def validate_upload(
    uploaded_file,
    *,
    allowed_extensions: tuple[str, ...] = DEFAULT_ALLOWED,
    max_bytes: int = DEFAULT_MAX_SIZE_BYTES,
) -> str:
    """Valida ``uploaded_file`` e devolve o nome higienizado. Levanta
    ``BusinessLogicError`` em qualquer inconsistência."""
    if uploaded_file is None:
        raise BusinessLogicError(code='FILE_REQUIRED', message='Nenhum arquivo enviado.')

    if uploaded_file.size > max_bytes:
        raise BusinessLogicError(
            code='FILE_TOO_LARGE',
            message=f'O arquivo excede o limite de {max_bytes // (1024 * 1024)} MB.',
        )

    ext = os.path.splitext(uploaded_file.name or '')[1].lower().lstrip('.')
    if ext not in allowed_extensions:
        raise BusinessLogicError(
            code='FILE_TYPE_NOT_ALLOWED',
            message='Formato não permitido. Aceitos: '
            + ', '.join(e.upper() for e in allowed_extensions)
            + '.',
        )

    head = uploaded_file.read(8)
    uploaded_file.seek(0)
    if not any(head.startswith(sig) for sig in SIGNATURES[ext]):
        raise BusinessLogicError(
            code='FILE_CONTENT_MISMATCH',
            message='O conteúdo do arquivo não corresponde à extensão informada.',
        )

    safe_name = sanitize_filename(uploaded_file.name)
    uploaded_file.name = safe_name
    return safe_name

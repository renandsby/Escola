"""Upload seguro de documentos (P2-DOC-UPLOAD).

Valida extensão, assinatura real do arquivo (magic bytes) e tamanho, e
higieniza o nome antes de persistir. Sem dependência de ``libmagic``.
"""

from __future__ import annotations

import os
import re
import unicodedata

from core.exceptions import BusinessLogicError
from core.scopes import apply_scope
from apps.documents.models import Document
from apps.students.models import Student

MAX_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

# extensão -> assinaturas aceitas no início do arquivo
_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    'pdf': (b'%PDF-',),
    'png': (b'\x89PNG\r\n\x1a\n',),
    'jpg': (b'\xff\xd8\xff',),
    'jpeg': (b'\xff\xd8\xff',),
    'docx': (b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08'),
}
ALLOWED_EXTENSIONS = tuple(_SIGNATURES)


def _sanitize_filename(name: str) -> str:
    name = os.path.basename(name or 'documento')
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    name = re.sub(r'[^A-Za-z0-9._-]+', '_', name).strip('._')
    return name or 'documento'


def _student_in_scope(student_id, actor_user) -> Student:
    student = (
        apply_scope(
            Student.objects.filter(deleted_at__isnull=True),
            actor_user,
            department_field='education_department_id',
            school_field='enrollments__school_class__school_id',
            teacher_class_field='enrollments__school_class_id',
            student_field='id',
        )
        .filter(id=student_id)
        .distinct()
        .first()
    )
    if student is None:
        raise BusinessLogicError(
            code='SCOPE_FORBIDDEN',
            message='Você não pode anexar documentos a este aluno.',
            status_code=403,
        )
    return student


def upload_document(
    *,
    student_id,
    document_type: str,
    uploaded_file,
    description: str = '',
    expiration_date=None,
    actor_user,
) -> Document:
    student = _student_in_scope(student_id, actor_user)

    if uploaded_file is None:
        raise BusinessLogicError(code='FILE_REQUIRED', message='Nenhum arquivo enviado.')

    if uploaded_file.size > MAX_SIZE_BYTES:
        raise BusinessLogicError(
            code='FILE_TOO_LARGE',
            message='O arquivo excede o limite de 15 MB.',
        )

    ext = os.path.splitext(uploaded_file.name or '')[1].lower().lstrip('.')
    if ext not in ALLOWED_EXTENSIONS:
        raise BusinessLogicError(
            code='FILE_TYPE_NOT_ALLOWED',
            message='Formato não permitido. Aceitos: PDF, PNG, JPG, JPEG, DOCX.',
        )

    head = uploaded_file.read(8)
    uploaded_file.seek(0)
    if not any(head.startswith(sig) for sig in _SIGNATURES[ext]):
        raise BusinessLogicError(
            code='FILE_CONTENT_MISMATCH',
            message='O conteúdo do arquivo não corresponde à extensão informada.',
        )

    safe_name = _sanitize_filename(uploaded_file.name)
    uploaded_file.name = safe_name

    return Document.objects.create(
        student=student,
        document_type=document_type,
        file=uploaded_file,
        file_name=safe_name,
        description=description or '',
        expiration_date=expiration_date or None,
        uploaded_by=actor_user if getattr(actor_user, 'is_authenticated', False) else None,
    )

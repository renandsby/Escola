"""Leitura de documentos com escopo RBAC (P2-DOC-UPLOAD)."""

from core.scopes import apply_scope
from apps.documents.models import Document


def get_documents_for_user(*, user, **filters):
    """Documentos visíveis conforme o papel:

    - SME: toda a rede;
    - direção/secretaria: apenas alunos com matrícula na sua escola;
    - professor: apenas alunos das suas turmas;
    - aluno/responsável: apenas os próprios dependentes.
    """
    qs = Document.objects.filter(is_active=True).select_related(
        'student', 'uploaded_by'
    )
    qs = apply_scope(
        qs,
        user,
        department_field='student__education_department_id',
        school_field='student__enrollments__school_class__school_id',
        teacher_class_field='student__enrollments__school_class_id',
        student_field='student_id',
    )
    if filters:
        qs = qs.filter(**filters)
    return qs.distinct()

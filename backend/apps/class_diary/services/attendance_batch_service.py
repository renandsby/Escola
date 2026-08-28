from django.db import transaction
from django.db.models import Q

from apps.class_diary.models import Attendance


@transaction.atomic
def batch_upsert_attendance(*, items: list[dict]) -> list[dict]:
    """Upsert em lote de frequência, O(1) em número de queries.

    A chave de upsert é ``(enrollment, date, subject)`` onde ``subject`` pode
    ser ``None`` (frequência diária para anos iniciais). A busca de registros
    existentes é particionada entre itens com e sem ``subject`` para que o
    ``None`` case some corretamente com linhas onde ``subject IS NULL`` (um
    ``subject_id__in=[...]`` simples nunca casa com ``None``).
    """
    if not items:
        return []

    enrollment_ids = {i['enrollment'] for i in items}

    non_null_subject_ids = {i.get('subject') for i in items if i.get('subject')}
    has_null_subject = any(i.get('subject') is None for i in items)

    subject_filter = Q()
    if non_null_subject_ids:
        subject_filter |= Q(subject_id__in=non_null_subject_ids)
    if has_null_subject:
        subject_filter |= Q(subject_id__isnull=True)

    existing_qs = Attendance.objects.filter(
        Q(enrollment_id__in=enrollment_ids) & subject_filter
    )

    keys = {(i['enrollment'], i['date'], i.get('subject')) for i in items}
    existing = {
        (a.enrollment_id, a.date, a.subject_id): a
        for a in existing_qs
        if (a.enrollment_id, a.date, a.subject_id) in keys
    }

    to_create = []
    to_update = []
    results = []

    for item in items:
        subject_id = item.get('subject')
        key = (item['enrollment'], item['date'], subject_id)
        if key in existing:
            attendance = existing[key]
            attendance.school_class_id = item['school_class']
            attendance.status = item['status']
            attendance.justification_note = item.get('justification_note', '')
            to_update.append(attendance)
            results.append({'id': str(attendance.id), 'created': False})
        else:
            attendance = Attendance(
                enrollment_id=item['enrollment'],
                school_class_id=item['school_class'],
                subject_id=subject_id,
                date=item['date'],
                status=item['status'],
                justification_note=item.get('justification_note', ''),
            )
            to_create.append(attendance)
            results.append({'id': str(attendance.id), 'created': True})

    if to_create:
        Attendance.objects.bulk_create(to_create, batch_size=500)
    if to_update:
        Attendance.objects.bulk_update(
            to_update,
            fields=['school_class_id', 'status', 'justification_note'],
            batch_size=500,
        )

    return results

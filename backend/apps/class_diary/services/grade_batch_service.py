from django.db import transaction

from core.exceptions import BusinessLogicError
from apps.class_diary.models import Grade
from apps.students.models import Enrollment


def _assert_years_open(enrollment_ids) -> None:
    """Bloqueia lançamentos retroativos em ano letivo já encerrado."""
    closed = (
        Enrollment.objects.filter(
            id__in=enrollment_ids,
            school_class__academic_year__status='CLOSED',
        ).exists()
    )
    if closed:
        raise BusinessLogicError(
            code='YEAR_ALREADY_CLOSED',
            message='O ano letivo desta turma está encerrado — não há lançamentos.',
        )


@transaction.atomic
def batch_upsert_grades(*, items: list[dict], actor_user) -> list[dict]:
    """Upsert em lote de notas, O(1) em número de queries (bulk_create/bulk_update).

    ``Grade.id`` é um UUIDField com ``default=uuid.uuid4`` gerado em Python na
    instanciação do objeto (ver core.models.BaseModel), portanto já está
    disponível antes do INSERT — não depende de PK auto-incremento do banco.
    """
    if not items:
        return []

    keys = {(i['enrollment'], i['subject'], i['academic_period']) for i in items}
    enrollment_ids = {i['enrollment'] for i in items}
    _assert_years_open(enrollment_ids)
    subject_ids = {i['subject'] for i in items}
    period_ids = {i['academic_period'] for i in items}

    existing = {
        (g.enrollment_id, g.subject_id, g.academic_period_id): g
        for g in Grade.objects.filter(
            enrollment_id__in=enrollment_ids,
            subject_id__in=subject_ids,
            academic_period_id__in=period_ids,
        )
        if (g.enrollment_id, g.subject_id, g.academic_period_id) in keys
    }

    to_create = []
    to_update = []
    results = []

    for item in items:
        key = (item['enrollment'], item['subject'], item['academic_period'])
        teacher_id = item.get('teacher') or actor_user.id
        if key in existing:
            grade = existing[key]
            grade.teacher_id = teacher_id
            grade.score = item['score']
            grade.recovery_score = item.get('recovery_score')
            grade.final_score = item.get('final_score')
            grade.assessment_type = item.get('assessment_type', 'PERIOD_EXAM')
            grade.notes = item.get('notes', '')
            to_update.append(grade)
            results.append({'id': str(grade.id), 'created': False})
        else:
            grade = Grade(
                enrollment_id=item['enrollment'],
                subject_id=item['subject'],
                academic_period_id=item['academic_period'],
                teacher_id=teacher_id,
                score=item['score'],
                recovery_score=item.get('recovery_score'),
                final_score=item.get('final_score'),
                assessment_type=item.get('assessment_type', 'PERIOD_EXAM'),
                notes=item.get('notes', ''),
            )
            to_create.append(grade)
            results.append({'id': str(grade.id), 'created': True})

    if to_create:
        Grade.objects.bulk_create(to_create, batch_size=500)
    if to_update:
        Grade.objects.bulk_update(
            to_update,
            fields=['teacher_id', 'score', 'recovery_score', 'final_score', 'assessment_type', 'notes'],
            batch_size=500,
        )

    return results

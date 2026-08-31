"""P1-LGPD — consentimento, portabilidade e anonimização."""

import pytest
from rest_framework.test import APIClient

from apps.audit.models import AuditLog
from apps.governance.models import ConsentRecord
from apps.governance.services.privacy_service import anonymize_inactive_student
from apps.students.models import Student
from apps.students.tests.factories import (
    EnrollmentFactory,
    GuardianFactory,
    SMEAdminFactory,
    StudentFactory,
    StudentGuardianFactory,
)
from apps.class_diary.tests.factories import GradeFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def guardian_with_student(db):
    dept_student = StudentFactory()
    guardian = GuardianFactory(user__education_department=dept_student.education_department)
    StudentGuardianFactory(student=dept_student, guardian=guardian)
    return guardian.user, dept_student


def test_guardian_exports_only_linked_student(guardian_with_student):
    guardian_user, student = guardian_with_student
    other_student = StudentFactory()

    client = APIClient()
    client.force_authenticate(guardian_user)

    ok = client.get('/api/v1/privacy/my-data/', {'student_id': str(student.id)})
    assert ok.status_code == 200
    assert ok.data['subject']['unique_municipal_id'] == student.unique_municipal_id

    forbidden = client.get('/api/v1/privacy/my-data/', {'student_id': str(other_student.id)})
    assert forbidden.status_code == 403


def test_export_writes_audit_log(guardian_with_student):
    guardian_user, student = guardian_with_student
    client = APIClient()
    client.force_authenticate(guardian_user)

    client.get('/api/v1/privacy/my-data/', {'student_id': str(student.id)})

    entry = AuditLog.objects.filter(action='SUBJECT_DATA_EXPORTED').first()
    assert entry is not None
    assert entry.object_id == str(student.id)
    assert entry.user_id == guardian_user.id


def test_record_and_read_consent(guardian_with_student):
    guardian_user, student = guardian_with_student
    client = APIClient()
    client.force_authenticate(guardian_user)

    resp = client.post(
        '/api/v1/privacy/consents/',
        {'student_id': str(student.id), 'consent_type': 'USO_IMAGEM', 'granted': True},
        format='json',
    )
    assert resp.status_code == 201

    status_resp = client.get('/api/v1/privacy/consents/', {'student_id': str(student.id)})
    assert status_resp.status_code == 200
    image = next(c for c in status_resp.data['consents'] if c['consent_type'] == 'USO_IMAGEM')
    assert image['granted'] is True
    assert ConsentRecord.objects.filter(student=student, consent_type='USO_IMAGEM').count() == 1


def test_consent_status_reflects_latest_revocation(guardian_with_student):
    guardian_user, student = guardian_with_student
    client = APIClient()
    client.force_authenticate(guardian_user)
    p = {'student_id': str(student.id), 'consent_type': 'COMUNICACAO'}
    client.post('/api/v1/privacy/consents/', {**p, 'granted': True}, format='json')
    client.post('/api/v1/privacy/consents/', {**p, 'granted': False}, format='json')

    status_resp = client.get('/api/v1/privacy/consents/', {'student_id': str(student.id)})
    comm = next(c for c in status_resp.data['consents'] if c['consent_type'] == 'COMUNICACAO')
    assert comm['granted'] is False


def test_anonymize_scrubs_pii_but_keeps_grades():
    enrollment = EnrollmentFactory()
    student = enrollment.student
    student.cpf = '12345678901'
    student.save(update_fields=['cpf'])
    GradeFactory(enrollment=enrollment, score=8)
    enrollment.status = 'TRANSFERRED_EXTERNAL'
    enrollment.save(update_fields=['status'])
    guardian = GuardianFactory()
    StudentGuardianFactory(student=student, guardian=guardian)

    admin = SMEAdminFactory(education_department=student.education_department)
    anonymize_inactive_student(student_id=student.id, actor_user=admin)

    student.refresh_from_db()
    # CPF real removido (substituído por marcador sintético, campo é obrigatório)
    assert student.cpf not in (None, '12345678901')
    assert 'ANONIMIZADO' in student.full_name
    assert student.mother_name == 'ANONIMIZADO'
    assert student.deleted_at is not None
    assert student.guardian_links.count() == 0
    # histórico intacto
    assert enrollment.grades.count() == 1
    assert enrollment.grades.first().score == 8


def test_anonymize_blocked_for_active_enrollment():
    from core.exceptions import BusinessLogicError

    enrollment = EnrollmentFactory(status='ENROLLED')
    admin = SMEAdminFactory(education_department=enrollment.student.education_department)

    with pytest.raises(BusinessLogicError) as exc:
        anonymize_inactive_student(student_id=enrollment.student_id, actor_user=admin)
    assert exc.value.code == 'STUDENT_HAS_ACTIVE_ENROLLMENT'


def test_anonymize_requires_sme_admin(guardian_with_student):
    guardian_user, student = guardian_with_student
    client = APIClient()
    client.force_authenticate(guardian_user)
    resp = client.post('/api/v1/privacy/anonymize/', {'student_id': str(student.id)}, format='json')
    assert resp.status_code == 403
    assert Student.objects.get(id=student.id).cpf == student.cpf

from datetime import date, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.admissions.models import AdmissionCycleStatus, EnrollmentRequestStatus

from .factories import (
    AcademicYearFactory,
    AdmissionCycleFactory,
    EducationDepartmentFactory,
    EnrollmentFactory,
    EnrollmentRequestFactory,
    GuardianFactory,
    RenewalRequestFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentGuardianFactory,
)

pytestmark = pytest.mark.django_db
_NOW = timezone.now()


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def test_sme_creates_cycle():
    dept = EducationDepartmentFactory()
    year = AcademicYearFactory(education_department=dept, year=_NOW.year + 1)
    admin = SMEAdminFactory(education_department=dept)

    payload = {
        'target_academic_year': str(year.id),
        'name': 'Admissão 2027',
        'renewal_opens_at': (_NOW - timedelta(days=1)).isoformat(),
        'renewal_closes_at': (_NOW + timedelta(days=5)).isoformat(),
        'new_request_opens_at': (_NOW + timedelta(days=6)).isoformat(),
        'new_request_closes_at': (_NOW + timedelta(days=20)).isoformat(),
    }
    resp = _client(admin).post('/api/v1/admissions/cycles/', payload, format='json')
    assert resp.status_code == 201, resp.data
    assert resp.data['status'] == 'DRAFT'


def test_guardian_cannot_create_cycle():
    resp = _client(GuardianFactory().user).post(
        '/api/v1/admissions/cycles/', {}, format='json'
    )
    assert resp.status_code == 403


def test_guardian_lists_only_own_renewals():
    link = StudentGuardianFactory()
    enrollment = EnrollmentFactory(student=link.student)
    cycle = AdmissionCycleFactory(status=AdmissionCycleStatus.RENEWAL_OPEN)
    RenewalRequestFactory(cycle=cycle, student=link.student, current_enrollment=enrollment)
    RenewalRequestFactory(cycle=cycle)  # de outro aluno

    resp = _client(link.guardian.user).get('/api/v1/admissions/renewals/')
    assert resp.status_code == 200
    assert resp.data['count'] == 1


def test_guardian_full_request_flow_via_api():
    dept = EducationDepartmentFactory()
    year = AcademicYearFactory(education_department=dept, year=_NOW.year + 1)
    cycle = AdmissionCycleFactory(
        education_department=dept, target_academic_year=year,
        status=AdmissionCycleStatus.NEW_OPEN,
    )
    guardian = GuardianFactory()
    schools = [SchoolFactory(education_department=dept) for _ in range(2)]
    client = _client(guardian.user)

    create = client.post(
        '/api/v1/admissions/enrollment-requests/',
        {
            'cycle': str(cycle.id),
            'desired_shift': 'MORNING',
            'target_grade_label': '1º ano',
            'residential_address': 'Rua X, 10',
            'applicant_name': 'Candidato Teste',
            'applicant_cpf': '529.982.247-25',
            'applicant_birth_date': '2020-03-01',
            'applicant_mother_name': 'Mãe',
        },
        format='json',
    )
    assert create.status_code == 201, create.data
    rid = create.data['id']

    prefs = client.post(
        f'/api/v1/admissions/enrollment-requests/{rid}/preferences/',
        {'schools': [str(s.id) for s in schools]},
        format='json',
    )
    assert prefs.status_code == 200, prefs.data

    submit = client.post(
        f'/api/v1/admissions/enrollment-requests/{rid}/submit/',
        {'lgpd_consent': True},
        format='json',
    )
    assert submit.status_code == 200, submit.data
    assert submit.data['status'] == EnrollmentRequestStatus.AWAITING_PROCESSING


def test_submit_without_consent_is_rejected():
    cycle = AdmissionCycleFactory(status=AdmissionCycleStatus.NEW_OPEN)
    schools = [SchoolFactory(education_department=cycle.education_department)]
    req = EnrollmentRequestFactory(cycle=cycle)
    from apps.admissions.services import enrollment_request_service

    enrollment_request_service.set_preferences(
        request_id=req.id, user=req.guardian.user, school_ids=[s.id for s in schools]
    )
    resp = _client(req.guardian.user).post(
        f'/api/v1/admissions/enrollment-requests/{req.id}/submit/',
        {'lgpd_consent': False},
        format='json',
    )
    assert resp.status_code == 400
    assert resp.data['error']['code'] == 'LGPD_CONSENT_REQUIRED'


def test_staff_verifies_evidence_via_api():
    from django.core.files.uploadedfile import SimpleUploadedFile
    from apps.admissions.services import enrollment_request_service

    cycle = AdmissionCycleFactory(status=AdmissionCycleStatus.NEW_OPEN)
    req = EnrollmentRequestFactory(cycle=cycle)
    ev = enrollment_request_service.attach_evidence(
        request_id=req.id, user=req.guardian.user, kind='SOCIAL_VULNERABILITY',
        uploaded_file=SimpleUploadedFile('c.pdf', b'%PDF-1.4 ok', content_type='application/pdf'),
    )
    admin = SMEAdminFactory(education_department=cycle.education_department)
    resp = _client(admin).post(
        f'/api/v1/admissions/evidence/{ev.id}/verify/',
        {'decision': 'VERIFIED'},
        format='json',
    )
    assert resp.status_code == 200, resp.data
    assert resp.data['status'] == 'VERIFIED'

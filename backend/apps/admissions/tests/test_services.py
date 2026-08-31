from datetime import timedelta

import pytest
from django.utils import timezone

from core.exceptions import BusinessLogicError
from apps.governance.models import ConsentRecord, ConsentType
from apps.students.models import Enrollment
from apps.admissions.models import (
    AdmissionCycleStatus,
    EnrollmentRequestStatus,
    EvidenceStatus,
    RenewalOutcome,
    RequestOrigin,
)
from apps.admissions.services import (
    cycle_service,
    enrollment_request_service,
    evidence_service,
    renewal_service,
)

from .factories import (
    AcademicYearFactory,
    AdmissionCycleFactory,
    EducationDepartmentFactory,
    EnrollmentFactory,
    EnrollmentRequestFactory,
    GuardianFactory,
    RenewalRequestFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    StudentGuardianFactory,
)

pytestmark = pytest.mark.django_db

_NOW = timezone.now()


def _windows():
    return {
        'renewal_opens_at': _NOW - timedelta(days=5),
        'renewal_closes_at': _NOW + timedelta(days=5),
        'new_request_opens_at': _NOW + timedelta(days=6),
        'new_request_closes_at': _NOW + timedelta(days=20),
    }


class TestCycleService:
    def test_create_cycle_and_advance(self):
        dept = EducationDepartmentFactory()
        year = AcademicYearFactory(education_department=dept, year=_NOW.year + 1)
        admin = SMEAdminFactory(education_department=dept)

        cycle = cycle_service.create_cycle(
            education_department=dept,
            target_academic_year=year,
            name='Admissão 2027',
            windows=_windows(),
            actor_user=admin,
        )
        assert cycle.status == AdmissionCycleStatus.DRAFT

        cycle = cycle_service.advance_status(cycle_id=cycle.id, actor_user=admin)
        assert cycle.status == AdmissionCycleStatus.RENEWAL_OPEN

    def test_create_cycle_rejects_new_before_renewal_close(self):
        dept = EducationDepartmentFactory()
        year = AcademicYearFactory(education_department=dept, year=_NOW.year + 1)
        bad = _windows()
        bad['new_request_opens_at'] = _NOW - timedelta(days=1)
        with pytest.raises(BusinessLogicError) as exc:
            cycle_service.create_cycle(
                education_department=dept,
                target_academic_year=year,
                name='x',
                windows=bad,
                actor_user=SMEAdminFactory(education_department=dept),
            )
        assert exc.value.code == 'INVALID_CYCLE_WINDOWS'

    def test_duplicate_cycle_blocked(self):
        cycle = AdmissionCycleFactory()
        with pytest.raises(BusinessLogicError) as exc:
            cycle_service.create_cycle(
                education_department=cycle.education_department,
                target_academic_year=cycle.target_academic_year,
                name='dup',
                windows=_windows(),
                actor_user=SMEAdminFactory(education_department=cycle.education_department),
            )
        assert exc.value.code == 'CYCLE_ALREADY_EXISTS'


class TestRenewalService:
    def _open_cycle_for(self, enrollment):
        year_next = AcademicYearFactory(
            education_department=enrollment.school_class.school.education_department,
            year=enrollment.school_class.academic_year.year + 1,
        )
        return AdmissionCycleFactory(
            education_department=year_next.education_department,
            target_academic_year=year_next,
            status=AdmissionCycleStatus.RENEWAL_OPEN,
        )

    def test_open_invites_creates_one_per_active_student(self):
        enrollment = EnrollmentFactory()
        cycle = self._open_cycle_for(enrollment)
        admin = SMEAdminFactory(education_department=cycle.education_department)

        result = renewal_service.open_renewal_invites(cycle_id=cycle.id, actor_user=admin)
        assert result['created'] == 1
        # idempotente
        assert renewal_service.open_renewal_invites(cycle_id=cycle.id, actor_user=admin)['created'] == 0

    def test_guardian_confirms_stay(self):
        link = StudentGuardianFactory()
        enrollment = EnrollmentFactory(student=link.student)
        cycle = self._open_cycle_for(enrollment)
        renewal = RenewalRequestFactory(
            cycle=cycle, student=link.student, current_enrollment=enrollment
        )

        renewal = renewal_service.submit_renewal(
            renewal_id=renewal.id, user=link.guardian.user, outcome='STAY',
            contact_phone='(81) 99999-0000',
        )
        assert renewal.outcome == RenewalOutcome.STAY
        assert renewal.confirmed_at is not None
        assert renewal.guardian_id == link.guardian.id

    def test_internal_transfer_spawns_enrollment_request(self):
        link = StudentGuardianFactory()
        enrollment = EnrollmentFactory(student=link.student)
        cycle = self._open_cycle_for(enrollment)
        renewal = RenewalRequestFactory(
            cycle=cycle, student=link.student, current_enrollment=enrollment
        )

        renewal_service.submit_renewal(
            renewal_id=renewal.id, user=link.guardian.user, outcome='INTERNAL_TRANSFER'
        )
        req = renewal.transfer_request
        assert req is not None
        assert req.origin == RequestOrigin.RENEWAL_TRANSFER

    def test_submit_forbidden_for_non_guardian(self):
        link = StudentGuardianFactory()
        enrollment = EnrollmentFactory(student=link.student)
        cycle = self._open_cycle_for(enrollment)
        renewal = RenewalRequestFactory(
            cycle=cycle, student=link.student, current_enrollment=enrollment
        )
        other = GuardianFactory()
        with pytest.raises(BusinessLogicError) as exc:
            renewal_service.submit_renewal(
                renewal_id=renewal.id, user=other.user, outcome='STAY'
            )
        assert exc.value.code == 'SCOPE_FORBIDDEN'

    def test_materialize_creates_next_year_enrollment(self):
        link = StudentGuardianFactory()
        enrollment = EnrollmentFactory(student=link.student)
        cycle = self._open_cycle_for(enrollment)
        renewal = RenewalRequestFactory(
            cycle=cycle, student=link.student, current_enrollment=enrollment,
            outcome=RenewalOutcome.STAY,
        )
        # consentimento LGPD exigido por enroll_student_in_class
        ConsentRecord.objects.create(
            student=link.student, consent_type=ConsentType.ENROLLMENT_DATA_USE, granted=True
        )
        target_class = SchoolClassFactory(
            school=enrollment.school_class.school,
            academic_year=cycle.target_academic_year,
        )
        admin = SMEAdminFactory(education_department=cycle.education_department)

        new_enr = renewal_service.materialize_renewal(
            renewal_id=renewal.id, school_class_id=target_class.id, actor_user=admin
        )
        renewal.refresh_from_db()
        assert renewal.next_enrollment_id == new_enr.id
        assert new_enr.school_class_id == target_class.id

        with pytest.raises(BusinessLogicError) as exc:
            renewal_service.materialize_renewal(
                renewal_id=renewal.id, school_class_id=target_class.id, actor_user=admin
            )
        assert exc.value.code == 'RENEWAL_ALREADY_MATERIALIZED'


class TestEnrollmentRequestService:
    def _open_new_cycle(self, dept=None):
        dept = dept or EducationDepartmentFactory()
        year = AcademicYearFactory(education_department=dept, year=_NOW.year + 1)
        return AdmissionCycleFactory(
            education_department=dept,
            target_academic_year=year,
            status=AdmissionCycleStatus.NEW_OPEN,
        )

    def test_create_for_new_applicant_and_submit(self):
        from datetime import date

        cycle = self._open_new_cycle()
        guardian = GuardianFactory()
        schools = [
            SchoolFactory(education_department=cycle.education_department) for _ in range(3)
        ]

        req = enrollment_request_service.create_request(
            user=guardian.user,
            cycle_id=cycle.id,
            desired_shift='MORNING',
            target_grade_label='1º ano',
            residential_address='Rua A, 1',
            applicant_name='Criança Teste',
            applicant_cpf='529.982.247-25',
            applicant_birth_date=date(2020, 5, 1),
            applicant_mother_name='Mãe Teste',
        )
        enrollment_request_service.set_preferences(
            request_id=req.id, user=guardian.user, school_ids=[s.id for s in schools]
        )
        req = enrollment_request_service.submit_request(
            request_id=req.id, user=guardian.user, lgpd_consent=True
        )
        assert req.status == EnrollmentRequestStatus.AWAITING_PROCESSING
        assert req.preferences.count() == 3

    def test_duplicate_cpf_is_blocked(self):
        cycle = self._open_new_cycle()
        existing = StudentFactory(education_department=cycle.education_department)
        guardian = GuardianFactory()
        with pytest.raises(BusinessLogicError) as exc:
            enrollment_request_service.create_request(
                user=guardian.user,
                cycle_id=cycle.id,
                desired_shift='MORNING',
                target_grade_label='1º ano',
                residential_address='Rua A, 1',
                applicant_name='X',
                applicant_cpf=existing.cpf,
                applicant_birth_date=timezone.now().date(),
                applicant_mother_name='Y',
            )
        assert exc.value.code == 'APPLICANT_ALREADY_REGISTERED'

    def test_submit_requires_preferences(self):
        cycle = self._open_new_cycle()
        req = EnrollmentRequestFactory(cycle=cycle)
        with pytest.raises(BusinessLogicError) as exc:
            enrollment_request_service.submit_request(
                request_id=req.id, user=req.guardian.user, lgpd_consent=True
            )
        assert exc.value.code == 'PREFERENCES_REQUIRED'

    def test_window_closed_blocks_create(self):
        dept = EducationDepartmentFactory()
        year = AcademicYearFactory(education_department=dept, year=_NOW.year + 1)
        cycle = AdmissionCycleFactory(
            education_department=dept, target_academic_year=year,
            status=AdmissionCycleStatus.DRAFT,  # não está em NEW_OPEN
        )
        with pytest.raises(BusinessLogicError) as exc:
            enrollment_request_service.create_request(
                user=GuardianFactory().user, cycle_id=cycle.id,
                desired_shift='MORNING', target_grade_label='1', residential_address='r',
                applicant_name='a', applicant_cpf='529.982.247-25',
                applicant_birth_date=timezone.now().date(), applicant_mother_name='m',
            )
        assert exc.value.code == 'NEW_REQUEST_WINDOW_CLOSED'


class TestEvidenceService:
    def test_verify_by_staff(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        cycle = AdmissionCycleFactory(status=AdmissionCycleStatus.NEW_OPEN)
        req = EnrollmentRequestFactory(cycle=cycle)
        evidence = enrollment_request_service.attach_evidence(
            request_id=req.id,
            user=req.guardian.user,
            kind='SOCIAL_VULNERABILITY',
            uploaded_file=SimpleUploadedFile('c.pdf', b'%PDF-1.4 teste', content_type='application/pdf'),
        )
        admin = SMEAdminFactory(education_department=cycle.education_department)
        evidence = evidence_service.verify_evidence(
            evidence_id=evidence.id, decision='VERIFIED', actor_user=admin
        )
        assert evidence.status == EvidenceStatus.VERIFIED
        assert evidence.verified_by_id == admin.id

    def test_guardian_cannot_verify(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        cycle = AdmissionCycleFactory(status=AdmissionCycleStatus.NEW_OPEN)
        req = EnrollmentRequestFactory(cycle=cycle)
        evidence = enrollment_request_service.attach_evidence(
            request_id=req.id, user=req.guardian.user, kind='PCD',
            uploaded_file=SimpleUploadedFile('c.pdf', b'%PDF-1.4 x', content_type='application/pdf'),
        )
        with pytest.raises(BusinessLogicError) as exc:
            evidence_service.verify_evidence(
                evidence_id=evidence.id, decision='VERIFIED', actor_user=req.guardian.user
            )
        assert exc.value.code == 'SCOPE_FORBIDDEN'

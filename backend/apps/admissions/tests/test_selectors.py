"""Escopo RBAC dos selectors de admissões (`apps/admissions/selectors/admissions.py`)."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.admissions.selectors.admissions import (
    get_cycles_for_user,
    get_enrollment_requests_for_user,
    get_evidence_queue_for_user,
    get_renewals_for_user,
)
from apps.students.tests.factories import (
    EducationDepartmentFactory,
    GuardianFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    TeacherUserFactory,
)

from .factories import (
    AdmissionCycleFactory,
    EnrollmentRequestFactory,
    RenewalRequestFactory,
)

pytestmark = pytest.mark.django_db


class _Anon:
    is_authenticated = False


class TestCyclesScope:
    def test_sme_admin_sees_own_department_only(self):
        dept = EducationDepartmentFactory()
        AdmissionCycleFactory(education_department=dept)
        AdmissionCycleFactory(education_department=EducationDepartmentFactory())

        admin = SMEAdminFactory(education_department=dept)
        assert get_cycles_for_user(user=admin).count() == 1

    def test_school_staff_resolves_department_via_school(self):
        dept = EducationDepartmentFactory()
        school = SchoolFactory(education_department=dept)
        AdmissionCycleFactory(education_department=dept)

        director = SchoolDirectorFactory(school=school, education_department=None)
        assert get_cycles_for_user(user=director).count() == 1

    def test_anonymous_and_unscoped_get_nothing(self):
        AdmissionCycleFactory()
        assert get_cycles_for_user(user=_Anon()).count() == 0
        assert get_cycles_for_user(user=TeacherUserFactory()).count() == 0


class TestRenewalsScope:
    def test_guardian_sees_only_their_students(self):
        guardian = GuardianFactory()
        mine = StudentFactory()
        guardian.student_links.create(
            student=mine, kinship_type="MOTHER", status="CONFIRMED"
        )
        RenewalRequestFactory(student=mine)
        RenewalRequestFactory()  # de outra família

        rows = get_renewals_for_user(user=guardian.user)
        assert [r.student_id for r in rows] == [mine.id]

    def test_staff_scoped_by_department(self):
        dept = EducationDepartmentFactory()
        cycle = AdmissionCycleFactory(education_department=dept)
        RenewalRequestFactory(cycle=cycle)
        RenewalRequestFactory()  # outra rede

        admin = SMEAdminFactory(education_department=dept)
        assert get_renewals_for_user(user=admin).count() == 1

    def test_filters_are_applied(self):
        dept = EducationDepartmentFactory()
        cycle = AdmissionCycleFactory(education_department=dept)
        RenewalRequestFactory(cycle=cycle, outcome="PENDING")
        RenewalRequestFactory(cycle=cycle, outcome="STAY")
        admin = SMEAdminFactory(education_department=dept)

        assert get_renewals_for_user(user=admin, outcome="STAY").count() == 1


class TestEnrollmentRequestsScope:
    def test_guardian_sees_own_requests(self):
        guardian = GuardianFactory()
        EnrollmentRequestFactory(guardian=guardian)
        EnrollmentRequestFactory()

        rows = get_enrollment_requests_for_user(user=guardian.user)
        assert [r.guardian_id for r in rows] == [guardian.id]

    def test_guardian_without_profile_gets_nothing(self):
        EnrollmentRequestFactory()
        assert get_enrollment_requests_for_user(user=TeacherUserFactory()).count() == 0

    def test_staff_scoped_by_department(self):
        dept = EducationDepartmentFactory()
        cycle = AdmissionCycleFactory(education_department=dept)
        EnrollmentRequestFactory(cycle=cycle)
        EnrollmentRequestFactory()

        admin = SMEAdminFactory(education_department=dept)
        assert get_enrollment_requests_for_user(user=admin).count() == 1


class TestEvidenceQueueScope:
    def test_non_staff_gets_empty_queue(self):
        assert get_evidence_queue_for_user(user=TeacherUserFactory()).count() == 0
        assert get_evidence_queue_for_user(user=GuardianFactory().user).count() == 0

    def test_staff_queue_is_scoped_and_filterable(self):
        dept = EducationDepartmentFactory()
        cycle = AdmissionCycleFactory(education_department=dept)
        request = EnrollmentRequestFactory(cycle=cycle)
        for kind, status in (("SIBLING", "PENDING"), ("PCD", "VERIFIED")):
            request.evidences.create(
                kind=kind,
                status=status,
                file=SimpleUploadedFile(f"{kind}.pdf", b"%PDF-1.4 test"),
                file_name=f"{kind}.pdf",
            )

        admin = SMEAdminFactory(education_department=dept)
        assert get_evidence_queue_for_user(user=admin).count() == 2
        assert get_evidence_queue_for_user(user=admin, status="PENDING").count() == 1

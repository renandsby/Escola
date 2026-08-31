"""Vinculação aluno–responsável com prova de parentesco (DX-SGE-006)."""

from datetime import date, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from core.exceptions import BusinessLogicError
from apps.students.models import (
    GuardianLinkCode,
    GuardianLinkStatus,
    StudentGuardian,
)
from apps.students.services import guardian_link_service

from .factories import (
    EducationDepartmentFactory,
    EnrollmentFactory,
    GuardianFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SMEAdminFactory,
    StudentFactory,
)

pytestmark = pytest.mark.django_db


def _student_with_school(dept=None):
    dept = dept or EducationDepartmentFactory()
    enr = EnrollmentFactory(
        student__education_department=dept,
        school_class=SchoolClassFactory(school__education_department=dept),
    )
    enr.student.birth_date = date(2016, 4, 10)
    enr.student.mother_name = 'Ana Maria Souza'
    enr.student.save(update_fields=['birth_date', 'mother_name'])
    return enr.student


# --------------------------------------------------------------------- Caminho A


class TestRequestLink:
    def test_match_creates_pending_link(self):
        student = _student_with_school()
        guardian = GuardianFactory()

        link = guardian_link_service.request_link(
            user=guardian.user,
            student_cpf=student.cpf,
            birth_date=date(2016, 4, 10),
            mother_name='ana maria souza',
            kinship_type='MOTHER',
        )
        assert link.status == GuardianLinkStatus.PENDING
        assert link.verification_method == 'SCHOOL_APPROVAL'
        assert link.requested_by_id == guardian.user_id

    def test_wrong_mother_name_fails_with_generic_message(self):
        student = _student_with_school()
        guardian = GuardianFactory()
        with pytest.raises(BusinessLogicError) as exc:
            guardian_link_service.request_link(
                user=guardian.user, student_cpf=student.cpf,
                birth_date=date(2016, 4, 10), mother_name='Outro Nome',
                kinship_type='MOTHER',
            )
        assert exc.value.code == 'STUDENT_MATCH_FAILED'

    def test_unknown_cpf_same_message(self):
        guardian = GuardianFactory()
        with pytest.raises(BusinessLogicError) as exc:
            guardian_link_service.request_link(
                user=guardian.user, student_cpf='529.982.247-25',
                birth_date=date(2016, 4, 10), mother_name='Ana Maria Souza',
                kinship_type='MOTHER',
            )
        assert exc.value.code == 'STUDENT_MATCH_FAILED'

    def test_duplicate_request_blocked(self):
        student = _student_with_school()
        guardian = GuardianFactory()
        kw = dict(user=guardian.user, student_cpf=student.cpf,
                  birth_date=date(2016, 4, 10), mother_name='Ana Maria Souza',
                  kinship_type='MOTHER')
        guardian_link_service.request_link(**kw)
        with pytest.raises(BusinessLogicError) as exc:
            guardian_link_service.request_link(**kw)
        assert exc.value.code == 'REQUEST_PENDING'


class TestReviewLink:
    def test_school_approves(self):
        dept = EducationDepartmentFactory()
        student = _student_with_school(dept)
        guardian = GuardianFactory()
        link = guardian_link_service.request_link(
            user=guardian.user, student_cpf=student.cpf, birth_date=date(2016, 4, 10),
            mother_name='Ana Maria Souza', kinship_type='MOTHER',
        )
        director = SchoolDirectorFactory(
            education_department=None,
            school=student.enrollments.first().school_class.school,
        )
        link = guardian_link_service.review_link(
            link_id=link.id, decision='approve', actor_user=director
        )
        assert link.status == GuardianLinkStatus.CONFIRMED
        assert link.confirmed_by_id == director.id

    def test_reject_requires_note(self):
        dept = EducationDepartmentFactory()
        student = _student_with_school(dept)
        guardian = GuardianFactory()
        link = guardian_link_service.request_link(
            user=guardian.user, student_cpf=student.cpf, birth_date=date(2016, 4, 10),
            mother_name='Ana Maria Souza', kinship_type='MOTHER',
        )
        admin = SMEAdminFactory(education_department=dept)
        with pytest.raises(BusinessLogicError) as exc:
            guardian_link_service.review_link(link_id=link.id, decision='reject', actor_user=admin)
        assert exc.value.code == 'REJECTION_NOTE_REQUIRED'

    def test_guardian_cannot_review(self):
        dept = EducationDepartmentFactory()
        student = _student_with_school(dept)
        guardian = GuardianFactory()
        link = guardian_link_service.request_link(
            user=guardian.user, student_cpf=student.cpf, birth_date=date(2016, 4, 10),
            mother_name='Ana Maria Souza', kinship_type='MOTHER',
        )
        with pytest.raises(BusinessLogicError) as exc:
            guardian_link_service.review_link(
                link_id=link.id, decision='approve', actor_user=guardian.user
            )
        assert exc.value.code == 'SCOPE_FORBIDDEN'


# --------------------------------------------------------------------- Caminho B


class TestLinkCode:
    def test_generate_and_redeem(self):
        dept = EducationDepartmentFactory()
        student = StudentFactory(education_department=dept)
        admin = SMEAdminFactory(education_department=dept)
        guardian = GuardianFactory()

        raw = guardian_link_service.generate_link_code(
            student_id=student.id, created_by=admin, kinship_hint='FATHER'
        )
        assert '-' in raw and len(raw) == 9

        link = guardian_link_service.redeem_link_code(
            user=guardian.user, student_cpf=student.cpf, code=raw.lower().replace('-', ' ')
        )
        assert link.status == GuardianLinkStatus.CONFIRMED
        assert link.verification_method == 'LINK_CODE'
        assert link.kinship_type == 'FATHER'
        assert GuardianLinkCode.objects.get(student=student).used is True

    def test_code_cannot_be_reused(self):
        dept = EducationDepartmentFactory()
        student = StudentFactory(education_department=dept)
        admin = SMEAdminFactory(education_department=dept)
        raw = guardian_link_service.generate_link_code(student_id=student.id, created_by=admin)
        guardian_link_service.redeem_link_code(
            user=GuardianFactory().user, student_cpf=student.cpf, code=raw
        )
        with pytest.raises(BusinessLogicError) as exc:
            guardian_link_service.redeem_link_code(
                user=GuardianFactory().user, student_cpf=student.cpf, code=raw
            )
        assert exc.value.code == 'INVALID_LINK_CODE'

    def test_wrong_cpf_rejected(self):
        dept = EducationDepartmentFactory()
        student = StudentFactory(education_department=dept)
        admin = SMEAdminFactory(education_department=dept)
        raw = guardian_link_service.generate_link_code(student_id=student.id, created_by=admin)
        with pytest.raises(BusinessLogicError) as exc:
            guardian_link_service.redeem_link_code(
                user=GuardianFactory().user, student_cpf='529.982.247-25', code=raw
            )
        assert exc.value.code == 'INVALID_LINK_CODE'

    def test_expired_code_rejected(self):
        dept = EducationDepartmentFactory()
        student = StudentFactory(education_department=dept)
        admin = SMEAdminFactory(education_department=dept)
        raw = guardian_link_service.generate_link_code(student_id=student.id, created_by=admin)
        GuardianLinkCode.objects.filter(student=student).update(
            expires_at=timezone.now() - timedelta(hours=1)
        )
        with pytest.raises(BusinessLogicError):
            guardian_link_service.redeem_link_code(
                user=GuardianFactory().user, student_cpf=student.cpf, code=raw
            )


class TestFindByCpf:
    def test_returns_only_found_flag(self):
        dept = EducationDepartmentFactory()
        student = StudentFactory(education_department=dept)
        client = APIClient()
        client.force_authenticate(GuardianFactory().user)
        resp = client.get('/api/v1/students/find-by-cpf/', {'cpf': student.cpf})
        assert resp.status_code == 200
        assert resp.data == {'found': True}

    def test_not_found(self):
        client = APIClient()
        client.force_authenticate(GuardianFactory().user)
        resp = client.get('/api/v1/students/find-by-cpf/', {'cpf': '529.982.247-25'})
        assert resp.data == {'found': False}


class TestPendingLinkHidesData:
    def test_pending_dependent_has_no_school_data(self):
        student = _student_with_school()
        guardian = GuardianFactory()
        guardian_link_service.request_link(
            user=guardian.user, student_cpf=student.cpf, birth_date=date(2016, 4, 10),
            mother_name='Ana Maria Souza', kinship_type='MOTHER',
        )
        client = APIClient()
        client.force_authenticate(guardian.user)
        rows = client.get('/api/v1/guardians/my-dependents/').data
        row = next(r for r in rows if r['student_id'] == str(student.id))
        assert row['link_status'] == 'PENDING'
        assert row['school'] is None and row['grade_average'] is None

        # e a ficha do aluno continua fora do alcance
        assert client.get(f'/api/v1/students/{student.id}/').status_code in (403, 404)

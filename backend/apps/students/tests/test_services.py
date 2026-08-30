import pytest

from core.exceptions import BusinessLogicError
from apps.students.models import Enrollment, EnrollmentStatus, TransferRequestStatus
from apps.students.services.enrollment_service import enroll_student_in_class
from apps.students.services.transfer_service import accept_transfer, authorize_transfer
from apps.students.tests.factories import (
    AcademicYearFactory,
    EnrollmentFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    TransferRequestFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestEnrollmentService:
    def test_should_enroll_student_successfully(self):
        student = StudentFactory()
        school_class = SchoolClassFactory(max_capacity=20)
        actor = UserFactory()

        enrollment = enroll_student_in_class(
            student_id=student.id,
            school_class_id=school_class.id,
            actor_user=actor,
        )

        assert enrollment.status == EnrollmentStatus.ENROLLED
        assert enrollment.student_id == student.id
        assert enrollment.school_class_id == school_class.id
        assert enrollment.academic_year_id == school_class.academic_year_id

    def test_should_raise_error_when_class_capacity_is_exceeded(self):
        school_class = SchoolClassFactory(max_capacity=1)
        student_1 = StudentFactory(education_department=school_class.school.education_department)
        student_2 = StudentFactory(education_department=school_class.school.education_department)
        actor = UserFactory()

        enroll_student_in_class(
            student_id=student_1.id,
            school_class_id=school_class.id,
            actor_user=actor,
        )

        with pytest.raises(BusinessLogicError) as exc_info:
            enroll_student_in_class(
                student_id=student_2.id,
                school_class_id=school_class.id,
                actor_user=actor,
            )

        assert exc_info.value.code == "CLASS_CAPACITY_EXCEEDED"

    def test_should_raise_error_on_duplicate_active_enrollment_same_year(self):
        first_enrollment = EnrollmentFactory(status=EnrollmentStatus.ENROLLED)
        student = first_enrollment.student
        other_class = SchoolClassFactory(
            school__education_department=student.education_department,
            academic_year=first_enrollment.school_class.academic_year,
        )
        actor = UserFactory()

        with pytest.raises(BusinessLogicError) as exc_info:
            enroll_student_in_class(
                student_id=student.id,
                school_class_id=other_class.id,
                actor_user=actor,
            )

        assert exc_info.value.code == "DUPLICATE_ENROLLMENT"

    def test_should_allow_second_enrollment_after_first_status_changes(self):
        first_enrollment = EnrollmentFactory(status=EnrollmentStatus.ENROLLED)
        student = first_enrollment.student
        other_class = SchoolClassFactory(
            school__education_department=student.education_department,
            academic_year=first_enrollment.school_class.academic_year,
        )
        actor = UserFactory()

        first_enrollment.status = EnrollmentStatus.TRANSFERRED_INTERNAL
        first_enrollment.save(update_fields=['status'])

        enrollment = enroll_student_in_class(
            student_id=student.id,
            school_class_id=other_class.id,
            actor_user=actor,
        )

        assert enrollment.status == EnrollmentStatus.ENROLLED
        assert Enrollment.objects.filter(
            student=student,
            status=EnrollmentStatus.ENROLLED,
            deleted_at__isnull=True,
        ).count() == 1


@pytest.mark.django_db
class TestTransferService:
    def test_authorize_transfer_happy_path(self):
        transfer = TransferRequestFactory(status=TransferRequestStatus.PENDING_SME)
        destination = SchoolFactory(education_department=transfer.student.education_department)
        actor = UserFactory()

        result = authorize_transfer(
            transfer_id=transfer.id,
            destination_school_id=destination.id,
            actor_user=actor,
        )

        assert result.status == TransferRequestStatus.APPROVED_BY_SME
        assert result.destination_school_id == destination.id

    def test_authorize_transfer_wrong_status_raises(self):
        transfer = TransferRequestFactory(status=TransferRequestStatus.APPROVED_BY_SME)
        actor = UserFactory()

        with pytest.raises(BusinessLogicError) as exc_info:
            authorize_transfer(transfer_id=transfer.id, actor_user=actor)

        assert exc_info.value.code == "INVALID_STATUS_TRANSITION"

    def test_accept_transfer_happy_path(self):
        destination = SchoolFactory()
        transfer = TransferRequestFactory(
            status=TransferRequestStatus.APPROVED_BY_SME,
            destination_school=destination,
        )
        actor = SchoolDirectorFactory(school=destination, education_department=destination.education_department)

        result = accept_transfer(transfer_id=transfer.id, actor_user=actor)

        assert result.status == TransferRequestStatus.ACCEPTED_BY_DESTINATION
        assert result.resolved_at is not None

    def test_accept_transfer_wrong_status_raises(self):
        transfer = TransferRequestFactory(status=TransferRequestStatus.PENDING_SME)
        actor = UserFactory()

        with pytest.raises(BusinessLogicError) as exc_info:
            accept_transfer(transfer_id=transfer.id, actor_user=actor)

        assert exc_info.value.code == "INVALID_STATUS_TRANSITION"

    def test_accept_transfer_missing_destination_raises(self):
        transfer = TransferRequestFactory(
            status=TransferRequestStatus.APPROVED_BY_SME,
            destination_school=None,
        )
        actor = UserFactory()

        with pytest.raises(BusinessLogicError) as exc_info:
            accept_transfer(transfer_id=transfer.id, actor_user=actor)

        assert exc_info.value.code == "DESTINATION_SCHOOL_REQUIRED"

    def test_accept_transfer_wrong_school_raises(self):
        destination = SchoolFactory()
        other_school = SchoolFactory()
        transfer = TransferRequestFactory(
            status=TransferRequestStatus.APPROVED_BY_SME,
            destination_school=destination,
        )
        actor = SchoolDirectorFactory(school=other_school, education_department=other_school.education_department)

        with pytest.raises(BusinessLogicError) as exc_info:
            accept_transfer(transfer_id=transfer.id, actor_user=actor)

        assert exc_info.value.code == "NOT_DESTINATION_SCHOOL"


@pytest.mark.django_db
class TestAcceptTransferEffect:
    """A aceitação com turma de destino encerra a matrícula antiga e cria a nova."""

    def _setup(self, *, dest_capacity=30, dest_dept=None):
        dept = AcademicYearFactory().education_department
        year = AcademicYearFactory(education_department=dept, status='ACTIVE')
        origin = SchoolFactory(education_department=dept)
        dest = SchoolFactory(education_department=dest_dept or dept)
        origin_class = SchoolClassFactory(school=origin, academic_year=year)
        dest_class = SchoolClassFactory(
            school=dest, academic_year=year, max_capacity=dest_capacity
        )
        student = StudentFactory(education_department=dept)
        origin_enr = EnrollmentFactory(
            student=student, school_class=origin_class, status='ENROLLED'
        )
        transfer = TransferRequestFactory(
            student=student, origin_school=origin, destination_school=dest,
            academic_year=year, status=TransferRequestStatus.APPROVED_BY_SME,
        )
        return dict(
            dept=dept, dest=dest, dest_class=dest_class, student=student,
            origin_enr=origin_enr, transfer=transfer,
        )

    def test_moves_enrollment_and_consumes_capacity(self):
        s = self._setup()
        director = SchoolDirectorFactory(school=s['dest'], education_department=s['dept'])

        result = accept_transfer(
            transfer_id=s['transfer'].id,
            destination_class_id=s['dest_class'].id,
            actor_user=director,
        )

        s['origin_enr'].refresh_from_db()
        assert s['origin_enr'].status == EnrollmentStatus.TRANSFERRED_INTERNAL
        assert result.status == TransferRequestStatus.ACCEPTED_BY_DESTINATION
        assert result.target_enrollment is not None
        assert result.target_enrollment.school_class_id == s['dest_class'].id
        assert Enrollment.objects.filter(
            school_class=s['dest_class'], status='ENROLLED'
        ).count() == 1

    def test_external_transfer_marks_transferred_external(self):
        from apps.classes.tests.factories import EducationDepartmentFactory

        s = self._setup(dest_dept=EducationDepartmentFactory())
        director = SchoolDirectorFactory(school=s['dest'], education_department=s['dest'].education_department)
        accept_transfer(
            transfer_id=s['transfer'].id,
            destination_class_id=s['dest_class'].id,
            actor_user=director,
        )
        s['origin_enr'].refresh_from_db()
        assert s['origin_enr'].status == EnrollmentStatus.TRANSFERRED_EXTERNAL

    def test_full_class_rolls_back_completely(self):
        s = self._setup(dest_capacity=1)
        EnrollmentFactory(school_class=s['dest_class'], status='ENROLLED')  # lota
        director = SchoolDirectorFactory(school=s['dest'], education_department=s['dept'])

        with pytest.raises(BusinessLogicError) as exc:
            accept_transfer(
                transfer_id=s['transfer'].id,
                destination_class_id=s['dest_class'].id,
                actor_user=director,
            )

        assert exc.value.code == 'CLASS_CAPACITY_EXCEEDED'
        s['origin_enr'].refresh_from_db()
        s['transfer'].refresh_from_db()
        assert s['origin_enr'].status == EnrollmentStatus.ENROLLED  # rollback
        assert s['transfer'].status == TransferRequestStatus.APPROVED_BY_SME

    def test_sme_admin_can_accept_for_any_school(self):
        s = self._setup()
        admin = SMEAdminFactory(education_department=s['dept'])
        result = accept_transfer(
            transfer_id=s['transfer'].id,
            destination_class_id=s['dest_class'].id,
            actor_user=admin,
        )
        assert result.status == TransferRequestStatus.ACCEPTED_BY_DESTINATION

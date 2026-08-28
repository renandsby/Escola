import pytest

from apps.students.selectors.enrollments import get_enrollments_for_user, get_transfer_requests_for_user
from apps.students.selectors.guardians import get_guardians_for_user
from apps.students.selectors.students import get_students_for_user
from apps.students.tests.factories import (
    EducationDepartmentFactory,
    EnrollmentFactory,
    GuardianFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    StudentGuardianFactory,
    StudentGuardianUserFactory,
    TeacherAllocationFactory,
    TeacherProfileFactory,
    TeacherUserFactory,
    TransferRequestFactory,
)


@pytest.mark.django_db
class TestGetEnrollmentsForUser:
    def _setup(self):
        department = EducationDepartmentFactory()
        other_department = EducationDepartmentFactory()
        school_a = SchoolFactory(education_department=department)
        school_b = SchoolFactory(education_department=department)
        class_a = SchoolClassFactory(school=school_a)
        class_b = SchoolClassFactory(school=school_b)

        enrollment_a = EnrollmentFactory(
            school_class=class_a,
            student__education_department=department,
        )
        enrollment_b = EnrollmentFactory(
            school_class=class_b,
            student__education_department=department,
        )
        enrollment_other_dept = EnrollmentFactory(student__education_department=other_department)

        return {
            'department': department,
            'school_a': school_a,
            'school_b': school_b,
            'class_a': class_a,
            'class_b': class_b,
            'enrollment_a': enrollment_a,
            'enrollment_b': enrollment_b,
            'enrollment_other_dept': enrollment_other_dept,
        }

    def test_sme_admin_sees_department_wide(self):
        ctx = self._setup()
        admin = SMEAdminFactory(education_department=ctx['department'])

        qs = get_enrollments_for_user(user=admin)
        ids = set(qs.values_list('id', flat=True))

        assert ctx['enrollment_a'].id in ids
        assert ctx['enrollment_b'].id in ids
        assert ctx['enrollment_other_dept'].id not in ids

    def test_school_director_sees_school_only(self):
        ctx = self._setup()
        director = SchoolDirectorFactory(school=ctx['school_a'], education_department=ctx['department'])

        qs = get_enrollments_for_user(user=director)
        ids = set(qs.values_list('id', flat=True))

        assert ctx['enrollment_a'].id in ids
        assert ctx['enrollment_b'].id not in ids

    def test_teacher_sees_only_allocated_class_enrollments(self):
        ctx = self._setup()
        teacher = TeacherUserFactory(education_department=ctx['department'])
        profile = TeacherProfileFactory(user=teacher, education_department=ctx['department'])
        TeacherAllocationFactory(teacher_profile=profile, school_class=ctx['class_a'])

        qs = get_enrollments_for_user(user=teacher)
        ids = set(qs.values_list('id', flat=True))

        assert ctx['enrollment_a'].id in ids
        assert ctx['enrollment_b'].id not in ids

    def test_student_guardian_sees_only_own_student_enrollments(self):
        ctx = self._setup()
        student_user = StudentGuardianUserFactory(education_department=ctx['department'])
        own_student = StudentFactory(user=student_user, education_department=ctx['department'])
        own_enrollment = EnrollmentFactory(student=own_student, school_class=ctx['class_a'])

        qs = get_enrollments_for_user(user=student_user)
        ids = set(qs.values_list('id', flat=True))

        assert own_enrollment.id in ids
        assert ctx['enrollment_a'].id not in ids
        assert ctx['enrollment_b'].id not in ids


@pytest.mark.django_db
class TestGetStudentsForUser:
    def test_sme_admin_sees_department_wide(self):
        department = EducationDepartmentFactory()
        other_department = EducationDepartmentFactory()
        student_in = StudentFactory(education_department=department)
        student_out = StudentFactory(education_department=other_department)
        admin = SMEAdminFactory(education_department=department)

        ids = set(get_students_for_user(user=admin).values_list('id', flat=True))

        assert student_in.id in ids
        assert student_out.id not in ids


@pytest.mark.django_db
class TestGetGuardiansForUser:
    def test_sme_admin_sees_only_linked_guardians_in_department(self):
        department = EducationDepartmentFactory()
        other_department = EducationDepartmentFactory()
        student_in = StudentFactory(education_department=department)
        student_out = StudentFactory(education_department=other_department)
        guardian_in = GuardianFactory()
        guardian_out = GuardianFactory()
        StudentGuardianFactory(student=student_in, guardian=guardian_in)
        StudentGuardianFactory(student=student_out, guardian=guardian_out)
        admin = SMEAdminFactory(education_department=department)

        ids = set(get_guardians_for_user(user=admin).values_list('id', flat=True))

        assert guardian_in.id in ids
        assert guardian_out.id not in ids


@pytest.mark.django_db
class TestGetTransferRequestsForUser:
    def test_sme_admin_sees_department_wide(self):
        department = EducationDepartmentFactory()
        other_department = EducationDepartmentFactory()
        transfer_in = TransferRequestFactory(student__education_department=department)
        transfer_out = TransferRequestFactory(student__education_department=other_department)
        admin = SMEAdminFactory(education_department=department)

        ids = set(get_transfer_requests_for_user(user=admin).values_list('id', flat=True))

        assert transfer_in.id in ids
        assert transfer_out.id not in ids

    def test_school_staff_sees_only_origin_or_destination_school(self):
        school_a = SchoolFactory()
        school_b = SchoolFactory()
        transfer_in = TransferRequestFactory(origin_school=school_a)
        transfer_out = TransferRequestFactory(origin_school=school_b)
        director = SchoolDirectorFactory(school=school_a, education_department=school_a.education_department)

        ids = set(get_transfer_requests_for_user(user=director).values_list('id', flat=True))

        assert transfer_in.id in ids
        assert transfer_out.id not in ids

"""Testes de escopo (RBAC) dos selectors do app apps.class_diary."""

import pytest

from apps.class_diary.selectors.attendance import get_attendance_for_user
from apps.class_diary.selectors.diary import get_diary_entries_for_user
from apps.class_diary.selectors.evaluations import get_descriptive_evaluations_for_user
from apps.class_diary.selectors.grades import get_grades_for_user
from apps.class_diary.tests.factories import (
    AttendanceFactory,
    DescriptiveEvaluationFactory,
    DiaryEntryFactory,
    EducationDepartmentFactory,
    EnrollmentFactory,
    GradeFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    StudentGuardianUserFactory,
    TeacherAllocationFactory,
    TeacherProfileFactory,
    TeacherUserFactory,
)


@pytest.mark.django_db
class TestGetGradesForUser:
    def _setup(self):
        department = EducationDepartmentFactory()
        other_department = EducationDepartmentFactory()
        school_a = SchoolFactory(education_department=department)
        school_b = SchoolFactory(education_department=department)
        class_a = SchoolClassFactory(school=school_a)
        class_b = SchoolClassFactory(school=school_b)

        enrollment_a = EnrollmentFactory(school_class=class_a, student__education_department=department)
        enrollment_b = EnrollmentFactory(school_class=class_b, student__education_department=department)
        enrollment_other_dept = EnrollmentFactory(student__education_department=other_department)

        grade_a = GradeFactory(enrollment=enrollment_a)
        grade_b = GradeFactory(enrollment=enrollment_b)
        grade_other_dept = GradeFactory(enrollment=enrollment_other_dept)

        return {
            'department': department,
            'school_a': school_a,
            'class_a': class_a,
            'class_b': class_b,
            'grade_a': grade_a,
            'grade_b': grade_b,
            'grade_other_dept': grade_other_dept,
        }

    def test_sme_admin_sees_department_wide(self):
        ctx = self._setup()
        admin = SMEAdminFactory(education_department=ctx['department'])

        ids = set(get_grades_for_user(user=admin).values_list('id', flat=True))

        assert ctx['grade_a'].id in ids
        assert ctx['grade_b'].id in ids
        assert ctx['grade_other_dept'].id not in ids

    def test_school_director_sees_school_only(self):
        ctx = self._setup()
        director = SchoolDirectorFactory(school=ctx['school_a'], education_department=ctx['department'])

        ids = set(get_grades_for_user(user=director).values_list('id', flat=True))

        assert ctx['grade_a'].id in ids
        assert ctx['grade_b'].id not in ids

    def test_teacher_sees_only_allocated_class_grades(self):
        ctx = self._setup()
        teacher = TeacherUserFactory(education_department=ctx['department'])
        profile = TeacherProfileFactory(user=teacher, education_department=ctx['department'])
        TeacherAllocationFactory(teacher_profile=profile, school_class=ctx['class_a'])

        ids = set(get_grades_for_user(user=teacher).values_list('id', flat=True))

        assert ctx['grade_a'].id in ids
        assert ctx['grade_b'].id not in ids

    def test_student_guardian_sees_only_own_grades(self):
        ctx = self._setup()
        student_user = StudentGuardianUserFactory(education_department=ctx['department'])
        own_student = StudentFactory(user=student_user, education_department=ctx['department'])
        own_enrollment = EnrollmentFactory(student=own_student, school_class=ctx['class_a'])
        own_grade = GradeFactory(enrollment=own_enrollment)

        ids = set(get_grades_for_user(user=student_user).values_list('id', flat=True))

        assert own_grade.id in ids
        assert ctx['grade_a'].id not in ids
        assert ctx['grade_b'].id not in ids


@pytest.mark.django_db
class TestGetAttendanceForUser:
    def test_sme_admin_sees_department_wide(self):
        department = EducationDepartmentFactory()
        other_department = EducationDepartmentFactory()
        attendance_in = AttendanceFactory(enrollment__student__education_department=department)
        attendance_out = AttendanceFactory(enrollment__student__education_department=other_department)
        admin = SMEAdminFactory(education_department=department)

        ids = set(get_attendance_for_user(user=admin).values_list('id', flat=True))

        assert attendance_in.id in ids
        assert attendance_out.id not in ids

    def test_school_director_sees_school_only(self):
        department = EducationDepartmentFactory()
        school_a = SchoolFactory(education_department=department)
        school_b = SchoolFactory(education_department=department)
        class_a = SchoolClassFactory(school=school_a)
        class_b = SchoolClassFactory(school=school_b)
        enrollment_a = EnrollmentFactory(school_class=class_a, student__education_department=department)
        enrollment_b = EnrollmentFactory(school_class=class_b, student__education_department=department)
        attendance_a = AttendanceFactory(enrollment=enrollment_a, school_class=class_a)
        attendance_b = AttendanceFactory(enrollment=enrollment_b, school_class=class_b)
        director = SchoolDirectorFactory(school=school_a, education_department=department)

        ids = set(get_attendance_for_user(user=director).values_list('id', flat=True))

        assert attendance_a.id in ids
        assert attendance_b.id not in ids


@pytest.mark.django_db
class TestGetDiaryEntriesForUser:
    def test_sme_admin_sees_department_wide(self):
        department = EducationDepartmentFactory()
        other_department = EducationDepartmentFactory()
        school_in = SchoolFactory(education_department=department)
        school_out = SchoolFactory(education_department=other_department)
        entry_in = DiaryEntryFactory(school_class__school=school_in)
        entry_out = DiaryEntryFactory(school_class__school=school_out)
        admin = SMEAdminFactory(education_department=department)

        ids = set(get_diary_entries_for_user(user=admin).values_list('id', flat=True))

        assert entry_in.id in ids
        assert entry_out.id not in ids

    def test_teacher_sees_only_allocated_class_entries(self):
        department = EducationDepartmentFactory()
        school = SchoolFactory(education_department=department)
        class_a = SchoolClassFactory(school=school)
        class_b = SchoolClassFactory(school=school)
        entry_a = DiaryEntryFactory(school_class=class_a)
        entry_b = DiaryEntryFactory(school_class=class_b)

        teacher = TeacherUserFactory(education_department=department)
        profile = TeacherProfileFactory(user=teacher, education_department=department)
        TeacherAllocationFactory(teacher_profile=profile, school_class=class_a)

        ids = set(get_diary_entries_for_user(user=teacher).values_list('id', flat=True))

        assert entry_a.id in ids
        assert entry_b.id not in ids


@pytest.mark.django_db
class TestGetDescriptiveEvaluationsForUser:
    def test_sme_admin_sees_department_wide(self):
        department = EducationDepartmentFactory()
        other_department = EducationDepartmentFactory()
        eval_in = DescriptiveEvaluationFactory(enrollment__student__education_department=department)
        eval_out = DescriptiveEvaluationFactory(enrollment__student__education_department=other_department)
        admin = SMEAdminFactory(education_department=department)

        ids = set(get_descriptive_evaluations_for_user(user=admin).values_list('id', flat=True))

        assert eval_in.id in ids
        assert eval_out.id not in ids

    def test_school_director_sees_school_only(self):
        department = EducationDepartmentFactory()
        school_a = SchoolFactory(education_department=department)
        school_b = SchoolFactory(education_department=department)
        class_a = SchoolClassFactory(school=school_a)
        class_b = SchoolClassFactory(school=school_b)
        enrollment_a = EnrollmentFactory(school_class=class_a, student__education_department=department)
        enrollment_b = EnrollmentFactory(school_class=class_b, student__education_department=department)
        eval_a = DescriptiveEvaluationFactory(enrollment=enrollment_a)
        eval_b = DescriptiveEvaluationFactory(enrollment=enrollment_b)
        director = SchoolDirectorFactory(school=school_a, education_department=department)

        ids = set(get_descriptive_evaluations_for_user(user=director).values_list('id', flat=True))

        assert eval_a.id in ids
        assert eval_b.id not in ids

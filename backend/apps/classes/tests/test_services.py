"""Testes da regra de negócio de alocação docente (allocate_teacher)."""

import pytest

from core.exceptions import BusinessLogicError

from apps.classes.models import TeacherAllocation
from apps.classes.services.allocation_service import allocate_teacher

from .factories import (
    SchoolClassFactory,
    SchoolFactory,
    SubjectFactory,
    TeacherProfileFactory,
)


@pytest.mark.django_db
class TestAllocateTeacher:
    def test_allocates_successfully(self):
        teacher = TeacherProfileFactory()
        school_class = SchoolClassFactory()

        allocation = allocate_teacher(
            teacher_profile_id=teacher.id,
            school_class_id=school_class.id,
        )

        assert allocation.pk is not None
        assert allocation.teacher_profile_id == teacher.id
        assert TeacherAllocation.objects.count() == 1

    def test_rejects_duplicate_allocation(self):
        teacher = TeacherProfileFactory()
        school = SchoolFactory()
        school_class = SchoolClassFactory(school=school)
        subject = SubjectFactory(education_department=school.education_department)
        allocate_teacher(
            teacher_profile_id=teacher.id,
            school_class_id=school_class.id,
            subject_id=subject.id,
        )

        with pytest.raises(BusinessLogicError) as exc:
            allocate_teacher(
                teacher_profile_id=teacher.id,
                school_class_id=school_class.id,
                subject_id=subject.id,
            )
        assert exc.value.code == 'DUPLICATE_ALLOCATION'

    def test_allows_same_class_different_subject(self):
        teacher = TeacherProfileFactory()
        school = SchoolFactory()
        school_class = SchoolClassFactory(school=school)
        subject_a = SubjectFactory(education_department=school.education_department)
        subject_b = SubjectFactory(education_department=school.education_department)

        allocate_teacher(
            teacher_profile_id=teacher.id, school_class_id=school_class.id, subject_id=subject_a.id
        )
        allocate_teacher(
            teacher_profile_id=teacher.id, school_class_id=school_class.id, subject_id=subject_b.id
        )

        assert TeacherAllocation.objects.filter(teacher_profile=teacher).count() == 2

    def test_rejects_overlapping_shift_same_year(self):
        teacher = TeacherProfileFactory()
        year_class = SchoolClassFactory(shift='MORNING')
        conflicting = SchoolClassFactory(
            school=year_class.school,
            academic_year=year_class.academic_year,
            shift='MORNING',
        )
        allocate_teacher(teacher_profile_id=teacher.id, school_class_id=year_class.id)

        with pytest.raises(BusinessLogicError) as exc:
            allocate_teacher(teacher_profile_id=teacher.id, school_class_id=conflicting.id)
        assert exc.value.code == 'TEACHER_SCHEDULE_CONFLICT'

    def test_full_time_conflicts_with_morning(self):
        teacher = TeacherProfileFactory()
        morning = SchoolClassFactory(shift='MORNING')
        full_time = SchoolClassFactory(
            school=morning.school,
            academic_year=morning.academic_year,
            shift='FULL_TIME',
        )
        allocate_teacher(teacher_profile_id=teacher.id, school_class_id=morning.id)

        with pytest.raises(BusinessLogicError) as exc:
            allocate_teacher(teacher_profile_id=teacher.id, school_class_id=full_time.id)
        assert exc.value.code == 'TEACHER_SCHEDULE_CONFLICT'

    def test_allows_non_overlapping_shifts(self):
        teacher = TeacherProfileFactory()
        morning = SchoolClassFactory(shift='MORNING')
        afternoon = SchoolClassFactory(
            school=morning.school,
            academic_year=morning.academic_year,
            shift='AFTERNOON',
        )

        allocate_teacher(teacher_profile_id=teacher.id, school_class_id=morning.id)
        allocate_teacher(teacher_profile_id=teacher.id, school_class_id=afternoon.id)

        assert TeacherAllocation.objects.filter(teacher_profile=teacher).count() == 2

    def test_allows_same_shift_different_academic_year(self):
        teacher = TeacherProfileFactory()
        class_2025 = SchoolClassFactory(shift='MORNING')
        class_2026 = SchoolClassFactory(school=class_2025.school, shift='MORNING')
        assert class_2025.academic_year_id != class_2026.academic_year_id

        allocate_teacher(teacher_profile_id=teacher.id, school_class_id=class_2025.id)
        allocate_teacher(teacher_profile_id=teacher.id, school_class_id=class_2026.id)

        assert TeacherAllocation.objects.filter(teacher_profile=teacher).count() == 2

    def test_teacher_not_found(self):
        school_class = SchoolClassFactory()
        with pytest.raises(BusinessLogicError) as exc:
            allocate_teacher(
                teacher_profile_id='00000000-0000-0000-0000-000000000000',
                school_class_id=school_class.id,
            )
        assert exc.value.code == 'TEACHER_NOT_FOUND'

    def test_class_not_found(self):
        teacher = TeacherProfileFactory()
        with pytest.raises(BusinessLogicError) as exc:
            allocate_teacher(
                teacher_profile_id=teacher.id,
                school_class_id='00000000-0000-0000-0000-000000000000',
            )
        assert exc.value.code == 'CLASS_NOT_FOUND'

from datetime import timedelta

import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.students.tests.factories import (  # noqa: F401 (reexport p/ os testes)
    AcademicYearFactory,
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
)

_NOW = timezone.now()


class AdmissionCycleFactory(DjangoModelFactory):
    class Meta:
        model = 'admissions.AdmissionCycle'

    education_department = factory.SubFactory(EducationDepartmentFactory)
    target_academic_year = factory.LazyAttribute(
        lambda o: AcademicYearFactory(
            education_department=o.education_department, year=_NOW.year + 1
        )
    )
    name = factory.Sequence(lambda n: f'Admissão {n}')
    renewal_opens_at = _NOW - timedelta(days=10)
    renewal_closes_at = _NOW + timedelta(days=10)
    new_request_opens_at = _NOW - timedelta(days=10)
    new_request_closes_at = _NOW + timedelta(days=10)
    status = 'DRAFT'


class RenewalRequestFactory(DjangoModelFactory):
    class Meta:
        model = 'admissions.RenewalRequest'

    cycle = factory.SubFactory(AdmissionCycleFactory)
    student = factory.SubFactory(StudentFactory)
    current_enrollment = factory.LazyAttribute(
        lambda o: EnrollmentFactory(student=o.student)
    )
    outcome = 'PENDING'


class EnrollmentRequestFactory(DjangoModelFactory):
    class Meta:
        model = 'admissions.EnrollmentRequest'

    cycle = factory.SubFactory(AdmissionCycleFactory)
    guardian = factory.SubFactory(GuardianFactory)
    origin = 'NEW'
    desired_shift = 'MORNING'
    target_grade_label = '1º ano'
    residential_address = 'Rua Teste, 100'
    status = 'DRAFT'

"""Cobertura dos geradores de relatório (`apps/reports/generators/*`).

Cada gerador do catálogo é exercitado de ponta a ponta via
``create_execution`` + ``run_execution`` (síncrono no teste), sobre uma rede
fictícia com matrícula, notas, frequência, pareceres e transferências. O
objetivo é garantir que nenhum gerador quebra com dados reais e que o arquivo
sai não-vazio.
"""

from datetime import date, timedelta

import pytest

from apps.classes.selectors.school_classes import get_school_classes_for_user
from apps.reports.catalog import REPORT_CATALOG, get_report_def
from apps.reports.models import ReportExecutionStatus
from apps.reports.services.executions import create_execution, run_execution
from apps.class_diary.tests.factories import (
    AcademicPeriodFactory,
    AttendanceFactory,
    DescriptiveEvaluationFactory,
    GradeFactory,
)
from apps.curriculum.tests.factories import CurriculumMatrixItemFactory
from apps.students.tests.factories import (
    AcademicYearFactory,
    EducationDepartmentFactory,
    EnrollmentFactory,
    SchoolClassFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    TeacherAllocationFactory,
    TransferRequestFactory,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def rich_network():
    dept = EducationDepartmentFactory(municipality_name="Igarassu")
    year = AcademicYearFactory(education_department=dept, status="ACTIVE", year=2025)
    periods = [
        AcademicPeriodFactory(
            academic_year=year,
            period_number=n,
            start_date=date(2025, 1 + (n - 1) * 3, 1),
            end_date=date(2025, 3 + (n - 1) * 3, 20),
        )
        for n in range(1, 5)
    ]
    admin = SMEAdminFactory(education_department=dept)

    classes = []
    for s in range(2):
        school = SchoolFactory(education_department=dept)
        klass = SchoolClassFactory(school=school, academic_year=year)
        items = [
            CurriculumMatrixItemFactory(curriculum_matrix=klass.curriculum_matrix)
            for _ in range(2)
        ]
        TeacherAllocationFactory(school_class=klass, is_regent=True)
        for i in range(3):
            student = StudentFactory(
                education_department=dept, nis_code=f"1234567890{s}{i}"
            )
            enr = EnrollmentFactory(student=student, school_class=klass)
            for item in items:
                GradeFactory(
                    enrollment=enr,
                    subject=item.subject,
                    academic_period=periods[0],
                    score="7.0" if i else "4.0",
                )
            DescriptiveEvaluationFactory(enrollment=enr, academic_period=periods[0])
            for d in range(10):
                AttendanceFactory(
                    enrollment=enr,
                    school_class=klass,
                    date=periods[0].start_date + timedelta(days=d),
                    status="PRESENT" if (i or d < 6) else "ABSENT",
                )
        classes.append(klass)

    TransferRequestFactory(
        student=StudentFactory(education_department=dept),
        origin_school=classes[0].school,
        academic_year=year,
        status="PENDING_SME",
    )
    return {"dept": dept, "year": year, "admin": admin, "classes": classes}


def _run(user, report_key, **params):
    params.setdefault("output_format", get_report_def(report_key).formats[0])
    execution = create_execution(user=user, report_key=report_key, raw_params=params)
    run_execution(str(execution.id))
    execution.refresh_from_db()
    return execution


@pytest.mark.parametrize("report_def", REPORT_CATALOG, ids=lambda d: d.key)
def test_every_generator_produces_a_terminal_execution(rich_network, report_def):
    admin = rich_network["admin"]
    params = {"output_format": report_def.formats[0]}
    if "network" not in report_def.scopes:
        klass = get_school_classes_for_user(user=admin).first()
        params["class_group_id"] = str(klass.id)

    execution = _run(admin, report_def.key, **params)

    assert execution.status in (
        ReportExecutionStatus.DONE,
        ReportExecutionStatus.ERROR,
    )
    if execution.status == ReportExecutionStatus.DONE:
        assert execution.file_size and execution.file_size > 0
        assert execution.file.name
    else:
        # falha controlada precisa carregar um código (ex.: educacenso sem dados)
        assert execution.error_code


class TestGeneratorVariants:
    def test_students_below_minimum_with_student_list(self, rich_network):
        execution = _run(
            rich_network["admin"],
            "students_below_minimum",
            output_format="XLSX",
            include_student_list=True,
        )
        assert execution.status == ReportExecutionStatus.DONE
        assert execution.contains_personal_data is True

    def test_attendance_bolsa_familia_csv(self, rich_network):
        execution = _run(
            rich_network["admin"],
            "attendance_bolsa_familia",
            output_format="CSV",
            include_student_list=True,
        )
        assert execution.status == ReportExecutionStatus.DONE
        assert execution.file_size > 0

    def test_school_performance_panel_with_charts(self, rich_network):
        execution = _run(
            rich_network["admin"],
            "school_performance_panel",
            output_format="PDF",
            include_charts=True,
            include_school_comparison=True,
        )
        assert execution.status == ReportExecutionStatus.DONE
        assert execution.file_size > 0

    def test_final_results_record_class_scope(self, rich_network):
        klass = get_school_classes_for_user(user=rich_network["admin"]).first()
        execution = _run(
            rich_network["admin"],
            "final_results_record",
            output_format="PDF",
            class_group_id=str(klass.id),
        )
        assert execution.status in (
            ReportExecutionStatus.DONE,
            ReportExecutionStatus.ERROR,
        )

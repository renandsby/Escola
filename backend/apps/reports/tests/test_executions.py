"""Fase 4 — catálogo, criação/execução assíncrona, download e auditoria."""

from datetime import date, timedelta

import pytest
from django.core.files.base import ContentFile
from rest_framework.test import APIClient

from apps.audit.models import AuditLog
from apps.class_diary.tests.factories import AttendanceFactory
from apps.curriculum.tests.factories import CurriculumMatrixItemFactory
from apps.governance.tests.factories import AcademicPeriodFactory
from apps.students.tests.factories import (
    AcademicYearFactory,
    EducationDepartmentFactory,
    EnrollmentFactory,
    SchoolClassFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    TeacherAllocationFactory,
    TeacherUserFactory,
)
from apps.reports.catalog import REPORT_CATALOG
from apps.reports.models import ReportExecution, ReportExecutionStatus
from apps.reports.services.executions import create_execution, run_execution
from core.exceptions import BusinessLogicError


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def network(db):
    dept = EducationDepartmentFactory(municipality_name='Igarassu')
    year = AcademicYearFactory(education_department=dept, status='ACTIVE', year=2025)
    AcademicPeriodFactory(academic_year=year, period_number=1)
    school = SchoolFactory(education_department=dept)
    klass = SchoolClassFactory(school=school, academic_year=year)
    CurriculumMatrixItemFactory(curriculum_matrix=klass.curriculum_matrix)
    TeacherAllocationFactory(school_class=klass, is_regent=True)
    for i in range(4):
        enr = EnrollmentFactory(
            student=StudentFactory(education_department=dept), school_class=klass
        )
        for k in range(10):
            AttendanceFactory(
                enrollment=enr, school_class=klass,
                status='PRESENT' if (i > 0 or k < 4) else 'ABSENT',
            )
    admin = SMEAdminFactory(education_department=dept)
    return dict(dept=dept, year=year, school=school, klass=klass, admin=admin)


@pytest.mark.django_db
class TestCatalog:
    def test_catalog_filtered_by_role(self, network):
        res = _client(network['admin']).get('/api/v1/reports/catalog/')
        assert res.status_code == 200
        keys = {d['key'] for d in res.data}
        assert 'educacenso_export' in keys  # SME
        assert len(keys) == len(REPORT_CATALOG)

    def test_teacher_sees_only_class_reports(self, network):
        res = _client(TeacherUserFactory()).get('/api/v1/reports/catalog/')
        keys = {d['key'] for d in res.data}
        assert keys == {'class_report_card', 'descriptive_reports'}


@pytest.mark.django_db
class TestExecutionFlow:
    def test_create_runs_and_produces_file(self, network):
        client = _client(network['admin'])
        res = client.post(
            '/api/v1/reports/executions/',
            {'report_key': 'students_below_minimum',
             'parameters': {'output_format': 'XLSX', 'coverage': 'all'}},
            format='json',
        )
        assert res.status_code == 202
        execution = ReportExecution.objects.get(id=res.data['id'])
        assert execution.status == ReportExecutionStatus.QUEUED

        run_execution(str(execution.id))  # síncrono no teste
        execution.refresh_from_db()
        assert execution.status == ReportExecutionStatus.DONE
        assert execution.file_size and execution.file_size > 0
        assert execution.row_count == 1  # 1 aluno abaixo de 75%

    def test_personal_data_report_writes_audit_log(self, network):
        execution = create_execution(
            user=network['admin'], report_key='students_below_minimum',
            raw_params={'output_format': 'XLSX', 'coverage': 'all', '_request_ip': '10.0.0.9'},
        )
        run_execution(str(execution.id))
        log = AuditLog.objects.get(action='REPORT_GENERATED', object_id=str(execution.id))
        assert log.changes['report_key'] == 'students_below_minimum'
        assert log.ip_address == '10.0.0.9'

    def test_rate_limit(self, network):
        for _ in range(5):
            ReportExecution.objects.create(
                report_key='students_below_minimum', requested_by=network['admin'],
                scope_level='network', output_format='XLSX', status='PROCESSING',
                education_department=network['dept'],
            )
        with pytest.raises(BusinessLogicError) as exc:
            create_execution(
                user=network['admin'], report_key='students_below_minimum',
                raw_params={'output_format': 'XLSX'},
            )
        assert exc.value.code == 'REPORT_RATE_LIMITED'
        assert exc.value.status_code == 429

    def test_invalid_format(self, network):
        with pytest.raises(BusinessLogicError) as exc:
            create_execution(
                user=network['admin'], report_key='students_below_minimum',
                raw_params={'output_format': 'DOCX'},
            )
        assert exc.value.code == 'INVALID_REPORT_PARAMS'

    def test_educacenso_validation_failure_marks_error(self, network):
        StudentFactory(
            education_department=network['dept'], birth_date=date(2015, 1, 1),
            gender='', race_color='', mother_name='',
        )
        execution = create_execution(
            user=network['admin'], report_key='educacenso_export',
            raw_params={'output_format': 'TXT'},
        )
        run_execution(str(execution.id))
        execution.refresh_from_db()
        assert execution.status == ReportExecutionStatus.ERROR
        assert execution.error_code == 'EDUCACENSO_VALIDATION_FAILED'
        assert execution.error_details['failures']


@pytest.mark.django_db
class TestScopeEnforcement:
    def test_director_cannot_request_other_school(self, network):
        other_school = SchoolFactory(education_department=network['dept'])
        director = SchoolDirectorFactory(school=network['school'])
        with pytest.raises(BusinessLogicError) as exc:
            create_execution(
                user=director, report_key='enrollment_movement',
                raw_params={'output_format': 'XLSX', 'school_id': str(other_school.id)},
            )
        assert exc.value.code == 'SCOPE_FORBIDDEN'
        assert exc.value.status_code == 403

    def test_history_scoped_to_school_for_director(self, network):
        director = SchoolDirectorFactory(school=network['school'])
        ReportExecution.objects.create(
            report_key='enrollment_movement', requested_by=network['admin'],
            scope_level='network', output_format='XLSX', status='DONE',
            education_department=network['dept'],
        )
        mine = create_execution(
            user=director, report_key='enrollment_movement',
            raw_params={'output_format': 'XLSX'},
        )
        res = _client(director).get('/api/v1/reports/executions/')
        ids = {r['id'] for r in res.data['results']}
        assert str(mine.id) in ids
        assert len(ids) == 1  # não vê a execução network do admin


@pytest.mark.django_db
class TestDownload:
    def test_expired_returns_410(self, network):
        execution = create_execution(
            user=network['admin'], report_key='enrollment_movement',
            raw_params={'output_format': 'XLSX'},
        )
        run_execution(str(execution.id))
        execution.refresh_from_db()
        execution.expires_at = execution.created_at - timedelta(days=1)
        execution.save(update_fields=['expires_at'])

        res = _client(network['admin']).get(
            f'/api/v1/reports/executions/{execution.id}/download/'
        )
        assert res.status_code == 410
        assert res.data['error']['code'] == 'REPORT_EXPIRED'

    def test_download_redirects_to_signed_url(self, network):
        execution = create_execution(
            user=network['admin'], report_key='enrollment_movement',
            raw_params={'output_format': 'XLSX'},
        )
        run_execution(str(execution.id))
        res = _client(network['admin']).get(
            f'/api/v1/reports/executions/{execution.id}/download/'
        )
        assert res.status_code == 302
        assert f'/executions/{execution.id}/file/?token=' in res['Location']

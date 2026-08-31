"""P1-AUDIT — persistência da trilha, sanitização, login e RBAC."""

import pytest
from rest_framework.test import APIClient

from apps.audit.models import AuditLog
from apps.audit.services.audit_service import log_action, sanitize
from core.validators import generate_cpf
from apps.students.tests.factories import (
    EducationDepartmentFactory,
    SchoolDirectorFactory,
    SMEAdminFactory,
    StudentFactory,
)


@pytest.mark.django_db
class TestAuditMiddleware:
    def test_write_request_creates_audit_log(self):
        dept = EducationDepartmentFactory()
        admin = SMEAdminFactory(education_department=dept)
        client = APIClient()
        client.force_authenticate(admin)

        payload = {
            'unique_municipal_id': 'AUD0001',
            'cpf': generate_cpf(30010),
            'full_name': 'Aluno Auditoria',
            'mother_name': 'Mãe Teste',
            'birth_date': '2015-05-05',
            'education_department': str(dept.id),
            'lgpd_consent': True,
        }
        res = client.post('/api/v1/students/', payload, format='json')
        assert res.status_code in (200, 201), res.data

        log = AuditLog.objects.filter(model_name='students', action='CREATE').latest('created_at')
        assert log.user_id == admin.id
        assert log.request_method == 'POST'
        assert log.status_code in (200, 201)

    def test_get_requests_are_not_audited(self):
        admin = SMEAdminFactory()
        client = APIClient()
        client.force_authenticate(admin)
        AuditLog.objects.all().delete()
        client.get('/api/v1/students/')
        assert AuditLog.objects.count() == 0


@pytest.mark.django_db
class TestSanitization:
    def test_sensitive_keys_are_redacted(self):
        clean = sanitize({
            'username': 'joao',
            'password': 'segredo123',
            'nested': {'refresh_token': 'abc', 'ok': 1},
            'list': [{'access': 'x'}],
        })
        assert clean['username'] == 'joao'
        assert clean['password'] == '***'
        assert clean['nested']['refresh_token'] == '***'
        assert clean['nested']['ok'] == 1
        assert clean['list'][0]['access'] == '***'

    def test_log_action_persists_sanitized_details(self):
        entry = log_action(
            action='UPDATE', resource='users', resource_id='1',
            details={'new_password': 'x', 'phone': '999'},
        )
        entry.refresh_from_db()
        assert entry.changes['new_password'] == '***'
        assert entry.changes['phone'] == '999'


@pytest.mark.django_db
class TestLoginAudit:
    def test_successful_login_is_logged(self):
        admin = SMEAdminFactory(username='auditadmin')
        admin.set_password('super-secret-1')
        admin.save()
        AuditLog.objects.all().delete()

        res = APIClient().post(
            '/api/v1/accounts/login/',
            {'username': 'auditadmin', 'password': 'super-secret-1'},
            format='json',
        )
        assert res.status_code == 200
        log = AuditLog.objects.get(action='LOGIN')
        assert log.user_id == admin.id
        # a senha nunca aparece no log
        assert 'super-secret-1' not in str(log.changes)

    def test_failed_login_is_logged(self):
        SMEAdminFactory(username='failadmin')
        AuditLog.objects.all().delete()
        res = APIClient().post(
            '/api/v1/accounts/login/',
            {'username': 'failadmin', 'password': 'wrong'},
            format='json',
        )
        assert res.status_code == 400
        assert AuditLog.objects.filter(action='LOGIN_FAILED').exists()


@pytest.mark.django_db
class TestAuditRBAC:
    def test_only_sme_admin_can_read(self):
        AuditLog.objects.create(action='CREATE', model_name='students')
        assert APIClient().get('/api/v1/audit/').status_code == 401

        c = APIClient()
        c.force_authenticate(SchoolDirectorFactory())
        assert c.get('/api/v1/audit/').status_code == 403

        c.force_authenticate(SMEAdminFactory())
        assert c.get('/api/v1/audit/').status_code == 200

    def test_scope_isolation_by_department(self):
        dept_a = EducationDepartmentFactory()
        dept_b = EducationDepartmentFactory()
        admin_a = SMEAdminFactory(education_department=dept_a)
        actor_b = SchoolDirectorFactory(education_department=dept_b)

        log_action(user=admin_a, action='UPDATE', resource='schools')
        log_action(user=actor_b, action='UPDATE', resource='schools')
        log_action(action='CREATE', resource='system')  # sistema

        c = APIClient()
        c.force_authenticate(admin_a)
        actions = c.get('/api/v1/audit/').data['results']
        user_ids = {a['user'] for a in actions}
        assert str(actor_b.id) not in user_ids

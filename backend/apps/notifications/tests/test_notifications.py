"""P2-NOTIF — emissão, isolamento e leitura de notificações."""

import pytest
from rest_framework.test import APIClient

from apps.notifications.models import Notification
from apps.notifications.services.notification_service import notify_role, notify_user
from apps.students.models import TransferRequestStatus
from apps.students.services.transfer_service import accept_transfer, authorize_transfer
from apps.students.tests.factories import (
    EnrollmentFactory,
    SchoolDirectorFactory,
    SchoolFactory,
    SMEAdminFactory,
    StudentFactory,
    TransferRequestFactory,
)
from core.models import UserRole

pytestmark = pytest.mark.django_db


def test_notifications_are_isolated_per_user():
    alice = SchoolDirectorFactory()
    bob = SchoolDirectorFactory()
    notify_user(user=alice, title='Só da Alice', message='...')

    client = APIClient()
    client.force_authenticate(bob)
    resp = client.get('/api/v1/notifications/')
    assert resp.data['count'] == 0

    client.force_authenticate(alice)
    resp = client.get('/api/v1/notifications/')
    assert resp.data['count'] == 1


def test_notify_role_scoped_to_school():
    school = SchoolFactory()
    here = SchoolDirectorFactory(school=school)
    elsewhere = SchoolDirectorFactory()

    notify_role(role=UserRole.SCHOOL_DIRECTOR, school_id=school.id, title='Aviso', message='x')

    assert Notification.objects.filter(user=here).count() == 1
    assert Notification.objects.filter(user=elsewhere).count() == 0


def test_mark_all_read_updates_counter():
    director = SchoolDirectorFactory()
    for i in range(3):
        notify_user(user=director, title=f'n{i}', message='x')

    client = APIClient()
    client.force_authenticate(director)
    assert client.get('/api/v1/notifications/unread_count/').data['unread'] == 3

    client.post('/api/v1/notifications/mark_all_read/')
    assert client.get('/api/v1/notifications/unread_count/').data['unread'] == 0


def test_transfer_flow_notifies_origin_destination_and_sme():
    enrollment = EnrollmentFactory(status='ENROLLED')
    student = enrollment.student
    origin = enrollment.school_class.school
    dest = SchoolFactory(education_department=origin.education_department)

    origin_dir = SchoolDirectorFactory(school=origin)
    dest_dir = SchoolDirectorFactory(school=dest)
    sme = SMEAdminFactory(education_department=origin.education_department)

    transfer = TransferRequestFactory(
        student=student,
        origin_school=origin,
        destination_school=dest,
        academic_year=enrollment.school_class.academic_year,
        status=TransferRequestStatus.PENDING_SME,
    )

    authorize_transfer(transfer_id=transfer.id, actor_user=sme)

    assert Notification.objects.filter(user=origin_dir, notification_type='transfer').exists()
    assert Notification.objects.filter(user=dest_dir, notification_type='transfer').exists()
    assert Notification.objects.filter(user=sme, notification_type='transfer').exists()

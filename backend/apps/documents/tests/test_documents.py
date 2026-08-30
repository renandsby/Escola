"""P2-DOC-UPLOAD — upload seguro e isolamento RBAC."""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.documents.models import Document
from apps.documents.services.document_service import upload_document
from apps.students.tests.factories import (
    EnrollmentFactory,
    GuardianFactory,
    SchoolDirectorFactory,
    StudentFactory,
    StudentGuardianFactory,
)
from core.exceptions import BusinessLogicError

pytestmark = pytest.mark.django_db

PDF_BYTES = b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n' + b'0' * 400
PNG_BYTES = b'\x89PNG\r\n\x1a\n' + b'0' * 400


def _pdf(name='historico.pdf'):
    return SimpleUploadedFile(name, PDF_BYTES, content_type='application/pdf')


def test_director_uploads_pdf_for_own_school_student():
    enrollment = EnrollmentFactory()
    director = SchoolDirectorFactory(school=enrollment.school_class.school)

    client = APIClient()
    client.force_authenticate(director)
    resp = client.post(
        '/api/v1/documents/',
        {'student': str(enrollment.student_id), 'document_type': 'previous_school', 'file': _pdf()},
        format='multipart',
    )
    assert resp.status_code == 201
    doc = Document.objects.get(id=resp.data['id'])
    assert doc.uploaded_by_id == director.id
    assert doc.file_name == 'historico.pdf'


def test_executable_upload_is_rejected():
    enrollment = EnrollmentFactory()
    director = SchoolDirectorFactory(school=enrollment.school_class.school)
    client = APIClient()
    client.force_authenticate(director)

    evil = SimpleUploadedFile('run.sh', b'#!/bin/sh\nrm -rf /\n', content_type='text/x-sh')
    resp = client.post(
        '/api/v1/documents/',
        {'student': str(enrollment.student_id), 'document_type': 'other', 'file': evil},
        format='multipart',
    )
    assert resp.status_code == 400
    assert Document.objects.count() == 0


def test_extension_ok_but_content_mismatch_is_rejected():
    enrollment = EnrollmentFactory()
    director = SchoolDirectorFactory(school=enrollment.school_class.school)
    client = APIClient()
    client.force_authenticate(director)

    fake_pdf = SimpleUploadedFile('nota.pdf', b'MZ\x90\x00 not a pdf', content_type='application/pdf')
    resp = client.post(
        '/api/v1/documents/',
        {'student': str(enrollment.student_id), 'document_type': 'other', 'file': fake_pdf},
        format='multipart',
    )
    assert resp.status_code == 400


def test_guardian_cannot_see_other_students_documents():
    mine = StudentFactory()
    guardian = GuardianFactory(user__education_department=mine.education_department)
    StudentGuardianFactory(student=mine, guardian=guardian)
    my_doc = upload_document(
        student_id=mine.id,
        document_type='rg',
        uploaded_file=_pdf(),
        actor_user=guardian.user,
    )

    other = StudentFactory()
    other_enrollment = EnrollmentFactory(student=other)
    other_dir = SchoolDirectorFactory(school=other_enrollment.school_class.school)
    upload_document(
        student_id=other.id,
        document_type='rg',
        uploaded_file=_pdf(),
        actor_user=other_dir,
    )

    client = APIClient()
    client.force_authenticate(guardian.user)
    resp = client.get('/api/v1/documents/')
    ids = {row['id'] for row in resp.data['results']}
    assert ids == {str(my_doc.id)}


def test_oversize_file_rejected():
    enrollment = EnrollmentFactory()
    big = io.BytesIO(b'%PDF-1.4\n' + b'0' * (15 * 1024 * 1024 + 10))
    upload = SimpleUploadedFile('big.pdf', big.getvalue(), content_type='application/pdf')
    with pytest.raises(BusinessLogicError) as exc:
        upload_document(
            student_id=enrollment.student_id,
            document_type='other',
            uploaded_file=upload,
            actor_user=SchoolDirectorFactory(school=enrollment.school_class.school),
        )
    assert exc.value.code == 'FILE_TOO_LARGE'


def test_filename_is_sanitized():
    enrollment = EnrollmentFactory()
    director = SchoolDirectorFactory(school=enrollment.school_class.school)
    doc = upload_document(
        student_id=enrollment.student_id,
        document_type='other',
        uploaded_file=SimpleUploadedFile('../../etc/pässwörd .pdf', PDF_BYTES),
        actor_user=director,
    )
    assert '/' not in doc.file_name
    assert ' ' not in doc.file_name

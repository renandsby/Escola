"""Endpoints de conformidade LGPD (P1-LGPD).

- ``GET  /api/v1/privacy/my-data/?student_id=`` — portabilidade do titular.
- ``GET  /api/v1/privacy/consents/?student_id=`` — situação de consentimento.
- ``POST /api/v1/privacy/consents/`` — registra ou revoga consentimento.
- ``POST /api/v1/privacy/anonymize/`` — anonimização (somente SME admin).
"""

from __future__ import annotations

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsSMEAdmin
from apps.governance.models import ConsentType
from apps.governance.services.privacy_service import (
    anonymize_inactive_student,
    export_subject_data,
    get_consent_status,
    record_consent,
)
from apps.students.selectors.students import get_students_for_user


def _client_ip(request):
    fwd = request.META.get('HTTP_X_FORWARDED_FOR')
    if fwd:
        return fwd.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _require_student_id(request) -> str:
    student_id = request.query_params.get('student_id') or request.data.get('student_id')
    if not student_id:
        raise serializers.ValidationError({'student_id': 'Parâmetro obrigatório.'})
    return student_id


class SubjectDataExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = export_subject_data(
            requesting_user=request.user,
            student_id=_require_student_id(request),
        )
        return Response(payload)


class ConsentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student = (
            get_students_for_user(user=request.user)
            .filter(id=_require_student_id(request))
            .first()
        )
        if student is None:
            return Response(
                {
                    'success': False,
                    'error': {
                        'code': 'SCOPE_FORBIDDEN',
                        'message': 'Você não tem acesso aos dados deste titular.',
                    },
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({'student_id': str(student.id), 'consents': get_consent_status(student=student)})

    def post(self, request):
        consent_type = request.data.get('consent_type')
        if consent_type not in ConsentType.values:
            raise serializers.ValidationError({'consent_type': 'Valor inválido.'})
        granted = bool(request.data.get('granted', True))
        record = record_consent(
            student_id=_require_student_id(request),
            consent_type=consent_type,
            granted=granted,
            requesting_user=request.user,
            ip_address=_client_ip(request),
        )
        return Response(
            {
                'consent_type': record.consent_type,
                'granted': record.granted,
                'term_version': record.term_version,
                'granted_at': record.granted_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class AnonymizeStudentView(APIView):
    permission_classes = [IsAuthenticated, IsSMEAdmin]

    def post(self, request):
        student = anonymize_inactive_student(
            student_id=_require_student_id(request),
            actor_user=request.user,
        )
        return Response(
            {'id': str(student.id), 'full_name': student.full_name, 'anonymized': True},
            status=status.HTTP_200_OK,
        )

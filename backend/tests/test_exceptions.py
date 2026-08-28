"""Testes do envelope global de erros (core/exceptions.py)."""

import uuid

import pytest
from django.urls import reverse
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from core.exceptions import BusinessLogicError, custom_exception_handler


class _DummyView(APIView):
    """View mínima usada apenas para montar um `context` compatível com DRF."""


def _build_context():
    factory = APIRequestFactory()
    django_request = factory.post('/api/v1/dummy/')
    view = _DummyView()
    view.request = view.initialize_request(django_request)
    return {'view': view, 'args': (), 'kwargs': {}, 'request': view.request}


class TestCustomExceptionHandlerUnit:
    """Chamada direta do handler, sem passar pelo ciclo HTTP completo."""

    def test_business_logic_error_envelope(self):
        exc = BusinessLogicError(code='TEST_CODE', message='Test message', status_code=409)
        context = _build_context()

        response = custom_exception_handler(exc, context)

        assert response.status_code == 409
        assert response.data == {
            'success': False,
            'error': {
                'code': 'TEST_CODE',
                'message': 'Test message',
                'details': None,
            },
        }


@pytest.mark.django_db
class TestCustomExceptionHandlerIntegration:
    def test_validation_error_returns_new_envelope(self, admin_client, department):
        """POST faltando campos obrigatórios deve retornar VALIDATION_ERROR."""
        url = reverse('student-list')
        response = admin_client.post(
            url,
            {
                'education_department': str(department.pk),
                # 'unique_municipal_id', 'full_name', 'mother_name' e
                # 'birth_date' são obrigatórios e foram omitidos de propósito.
            },
            format='json',
        )

        assert response.status_code == 400
        body = response.json()
        assert body['success'] is False
        assert body['error']['code'] == 'VALIDATION_ERROR'
        assert body['error']['message'] == 'Dados inválidos enviados na requisição.'
        assert body['error']['details'] is not None

    def test_unauthenticated_request_returns_new_envelope(self, api_client):
        url = reverse('student-list')
        response = api_client.get(url)

        assert response.status_code == 401
        body = response.json()
        assert body['success'] is False
        assert body['error']['code'] == 'NOTAUTHENTICATED'
        assert 'message' in body['error']
        assert 'details' in body['error']

    def test_not_found_returns_new_envelope(self, admin_client):
        url = reverse('student-detail', kwargs={'pk': uuid.uuid4()})
        response = admin_client.get(url)

        assert response.status_code == 404
        body = response.json()
        assert body['success'] is False
        # A exceção original (django.http.Http404) chega ao nosso handler
        # sem ser convertida para NotFound — a conversão acontece apenas
        # dentro do exception_handler padrão do DRF, de forma local.
        assert body['error']['code'] == 'HTTP404'
        assert 'message' in body['error']
        assert 'details' in body['error']

import pytest
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestHealthEndpoints:
    def test_health_endpoint_returns_ok(self):
        client = APIClient()
        response = client.get('/health/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'healthy'
        assert response.data['message'] == 'API está operacional'

    def test_ready_endpoint_handles_request(self):
        client = APIClient()
        response = client.get('/health/ready/')
        assert response.status_code in (
            status.HTTP_200_OK,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        assert 'status' in response.data

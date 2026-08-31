import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.tests.factories import UserFactory
from apps.integrations.tests.factories import IntegrationFactory


@pytest.mark.django_db
class TestIntegrations:
    def test_create_integration_model(self):
        integration = IntegrationFactory(name='Google Classroom')
        assert integration.id is not None
        assert str(integration) == 'Google Classroom'
        assert integration.is_active is True

    def test_list_integrations_requires_auth(self):
        client = APIClient()
        response = client.get('/api/v1/integrations/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_integrations_authenticated(self):
        user = UserFactory()
        IntegrationFactory()

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get('/api/v1/integrations/')
        assert response.status_code == status.HTTP_200_OK

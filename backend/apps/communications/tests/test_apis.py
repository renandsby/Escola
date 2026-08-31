import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.tests.factories import UserFactory
from apps.communications.tests.factories import MessageFactory


@pytest.mark.django_db
class TestCommunicationsAPI:
    def test_list_messages_requires_auth(self):
        client = APIClient()
        response = client.get('/api/v1/communications/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_messages_returns_only_recipient_messages(self):
        user = UserFactory()
        other_user = UserFactory()
        MessageFactory(recipient=user, subject='Minha Mensagem')
        MessageFactory(recipient=other_user, subject='Outra Mensagem')

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get('/api/v1/communications/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['subject'] == 'Minha Mensagem'

    def test_create_message(self):
        sender = UserFactory()
        recipient = UserFactory()

        client = APIClient()
        client.force_authenticate(user=sender)

        payload = {
            'recipient': str(recipient.id),
            'subject': 'Aviso de Reunião',
            'body': 'Reunião de pais na próxima sexta.',
        }
        response = client.post('/api/v1/communications/', payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['subject'] == 'Aviso de Reunião'
        assert response.data['recipient'] == recipient.id

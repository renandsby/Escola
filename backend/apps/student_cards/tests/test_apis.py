import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.tests.factories import UserFactory
from apps.student_cards.tests.factories import StudentCardFactory


@pytest.mark.django_db
class TestStudentCardsAPI:
    def test_list_cards_requires_auth(self):
        client = APIClient()
        response = client.get('/api/v1/student-cards/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_cards_authenticated(self):
        user = UserFactory()
        card = StudentCardFactory()

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get('/api/v1/student-cards/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) >= 1

import pytest
from apps.communications.models import Message
from apps.communications.tests.factories import MessageFactory


@pytest.mark.django_db
class TestMessageModel:
    def test_create_message(self):
        message = MessageFactory()
        assert message.id is not None
        assert message.read is False
        assert message.read_at is None
        assert message.is_active is True

    def test_message_str(self):
        message = MessageFactory(subject='Comunicado Importante')
        assert str(message) == 'Comunicado Importante'

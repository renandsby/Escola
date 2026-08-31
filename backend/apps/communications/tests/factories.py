"""Factories para o app apps.communications."""

import factory
from apps.authentication.tests.factories import UserFactory
from apps.communications.models import Message


class MessageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Message

    sender = factory.SubFactory(UserFactory)
    recipient = factory.SubFactory(UserFactory)
    subject = factory.Sequence(lambda n: f'Assunto da Mensagem {n}')
    body = factory.Sequence(lambda n: f'Corpo da mensagem de teste {n}')
    read = False
    is_active = True

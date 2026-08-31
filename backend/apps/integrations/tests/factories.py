"""Factories para o app apps.integrations."""

import factory
from factory.django import DjangoModelFactory
from apps.classes.tests.factories import SchoolFactory
from apps.integrations.models import Integration


class IntegrationFactory(DjangoModelFactory):
    class Meta:
        model = Integration

    school = factory.SubFactory(SchoolFactory)
    name = factory.Sequence(lambda n: f'Integração {n}')
    integration_type = 'WEBHOOK'
    api_key = factory.Sequence(lambda n: f'key_{n:08d}')
    is_active = True
    config = factory.LazyFunction(dict)

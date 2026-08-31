"""Factories para o app apps.student_cards."""

from datetime import date, timedelta
import factory
from factory.django import DjangoModelFactory
from apps.students.tests.factories import StudentFactory
from apps.student_cards.models import StudentCard


class StudentCardFactory(DjangoModelFactory):
    class Meta:
        model = StudentCard

    student = factory.SubFactory(StudentFactory)
    card_number = factory.Sequence(lambda n: f'CARD-{n:06d}')
    expiration_date = factory.LazyFunction(lambda: date.today() + timedelta(days=365))
    qr_code_data = ''
    is_active = True

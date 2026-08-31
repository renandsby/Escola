import pytest
from apps.student_cards.tests.factories import StudentCardFactory


@pytest.mark.django_db
class TestStudentCardModel:
    def test_create_student_card(self):
        card = StudentCardFactory()
        assert card.id is not None
        assert card.card_number.startswith('CARD-')
        assert card.is_active is True

    def test_student_card_str(self):
        card = StudentCardFactory(card_number='CARD-999999')
        assert str(card) == 'Carteirinha CARD-999999'

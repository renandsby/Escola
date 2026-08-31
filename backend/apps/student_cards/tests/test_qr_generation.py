import pytest
from apps.student_cards.tests.factories import StudentCardFactory


@pytest.mark.django_db
class TestStudentCardQRCode:
    def test_generate_qr_code(self):
        card = StudentCardFactory()
        card.generate_qr_code()

        assert card.qr_code is not None
        assert card.qr_code_data.startswith('CARD:')
        assert card.card_number in card.qr_code_data
        assert str(card.student.unique_municipal_id) in card.qr_code_data

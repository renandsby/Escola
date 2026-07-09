from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel
import qrcode
import io
from django.core.files.base import ContentFile


class StudentCard(BaseModel):
    """Modelo de Carteirinha - Identificação do aluno."""

    student = models.OneToOneField(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='student_card',
        verbose_name=_('Aluno'),
    )

    card_number = models.CharField(max_length=20, unique=True, verbose_name=_('Número da Carteirinha'))
    issue_date = models.DateField(auto_now_add=True, verbose_name=_('Data de Emissão'))
    expiration_date = models.DateField(verbose_name=_('Data de Validade'))

    qr_code = models.ImageField(upload_to='qr_codes/', verbose_name=_('QR Code'))
    qr_code_data = models.TextField(verbose_name=_('Dados QR Code'))

    class Meta:
        verbose_name = _('Carteirinha')
        verbose_name_plural = _('Carteirinhas')

    def __str__(self):
        return f"Carteirinha {self.card_number}"

    def generate_qr_code(self):
        """Gera QR code para a carteirinha."""
        qr_data = f"CARD:{self.card_number}|STUDENT:{self.student.registration_number}|SCHOOL:{self.student.school.cnpj}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)

        self.qr_code.save(f'{self.card_number}_qr.png', ContentFile(img_io.getvalue()))
        self.qr_code_data = qr_data

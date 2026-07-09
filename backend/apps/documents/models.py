from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Document(BaseModel):
    """Modelo de Documento - Arquivos de alunos e escola."""

    DOCUMENT_TYPES = [
        ('rg', _('RG')),
        ('cpf', _('CPF')),
        ('birth_certificate', _('Certidão de Nascimento')),
        ('address_proof', _('Comprovante de Endereço')),
        ('previous_school', _('Histórico Anterior')),
        ('medical_report', _('Relatório Médico')),
        ('other', _('Outro')),
    ]

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_('Aluno'),
    )

    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPES,
        verbose_name=_('Tipo de Documento'),
    )
    file = models.FileField(upload_to='documents/%Y/%m/', verbose_name=_('Arquivo'))
    file_name = models.CharField(max_length=255, verbose_name=_('Nome do Arquivo'))
    description = models.TextField(blank=True, verbose_name=_('Descrição'))

    expiration_date = models.DateField(null=True, blank=True, verbose_name=_('Data de Expiração'))
    uploaded_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_documents',
        verbose_name=_('Enviado por'),
    )

    class Meta:
        verbose_name = _('Documento')
        verbose_name_plural = _('Documentos')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'document_type']),
        ]

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.student}"

from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel, User


class Message(BaseModel):
    """Modelo de Mensagem - Comunicação entre usuários."""

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        verbose_name=_('Remetente'),
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_messages',
        verbose_name=_('Destinatário'),
    )

    subject = models.CharField(max_length=255, verbose_name=_('Assunto'))
    body = models.TextField(verbose_name=_('Mensagem'))

    read = models.BooleanField(default=False, verbose_name=_('Lido'))
    read_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Lido em'))

    class Meta:
        verbose_name = _('Mensagem')
        verbose_name_plural = _('Mensagens')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'read']),
        ]

    def __str__(self):
        return f"{self.subject}"

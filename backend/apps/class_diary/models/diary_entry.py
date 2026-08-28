from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class DiaryEntry(BaseModel):
    """Diário de classe."""

    school_class = models.ForeignKey(
        'classes.SchoolClass',
        on_delete=models.PROTECT,
        related_name='diary_entries',
        verbose_name=_('Turma'),
    )
    subject = models.ForeignKey(
        'curriculum.Subject',
        on_delete=models.PROTECT,
        related_name='diary_entries',
        verbose_name=_('Disciplina'),
    )
    teacher = models.ForeignKey(
        'classes.TeacherProfile',
        on_delete=models.PROTECT,
        related_name='diary_entries',
        verbose_name=_('Professor'),
    )
    date = models.DateField(auto_now_add=True, verbose_name=_('Data'))
    content = models.TextField(verbose_name=_('Conteúdo Ministrado'))
    homework = models.TextField(blank=True, verbose_name=_('Tarefa de Casa'))
    observations = models.TextField(blank=True, verbose_name=_('Observações'))

    class Meta:
        verbose_name = _('Diário de Classe')
        verbose_name_plural = _('Diários de Classe')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['school_class', 'date']),
        ]

    def __str__(self):
        return f"{self.school_class} - {self.date}"

    @property
    def class_obj(self):
        return self.school_class

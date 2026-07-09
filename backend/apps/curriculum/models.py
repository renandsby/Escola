from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Curriculum(BaseModel):
    """Modelo de Grade Curricular."""

    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='curriculums',
        verbose_name=_('Escola'),
    )

    name = models.CharField(max_length=100, verbose_name=_('Nome'))
    grade_level = models.CharField(max_length=50, verbose_name=_('Série/Nível'))
    year = models.IntegerField(verbose_name=_('Ano'))

    subjects = models.ManyToManyField(
        'subjects.Subject',
        related_name='curriculums',
        verbose_name=_('Disciplinas'),
    )

    class Meta:
        verbose_name = _('Grade Curricular')
        verbose_name_plural = _('Grades Curriculares')
        unique_together = ['school', 'grade_level', 'year']

    def __str__(self):
        return f"{self.name} - {self.year}"

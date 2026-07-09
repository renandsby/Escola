from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Class(BaseModel):
    """Modelo de Turma - Agrupamento de alunos."""

    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        related_name='classes',
        verbose_name=_('Escola'),
    )

    name = models.CharField(max_length=100, verbose_name=_('Nome da Turma'))
    code = models.CharField(max_length=20, verbose_name=_('Código'))
    year = models.IntegerField(verbose_name=_('Ano Letivo'))
    semester = models.IntegerField(choices=[(1, '1º Semestre'), (2, '2º Semestre')], verbose_name=_('Semestre'))
    grade_level = models.CharField(max_length=50, verbose_name=_('Série/Nível'))

    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='classes',
        verbose_name=_('Professor Responsável'),
    )

    classroom = models.ForeignKey(
        'classrooms.Classroom',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='classes',
        verbose_name=_('Sala de Aula'),
    )

    subjects = models.ManyToManyField(
        'subjects.Subject',
        related_name='classes',
        verbose_name=_('Disciplinas'),
    )

    status = models.CharField(
        max_length=20,
        choices=[('active', _('Ativa')), ('inactive', _('Inativa')), ('archived', _('Arquivada'))],
        default='active',
        verbose_name=_('Status'),
    )

    class Meta:
        verbose_name = _('Turma')
        verbose_name_plural = _('Turmas')
        unique_together = ['school', 'code', 'year', 'semester']
        indexes = [
            models.Index(fields=['school', 'year', 'status']),
        ]

    def __str__(self):
        return f"{self.code} - {self.year}"

    def get_student_count(self):
        """Retorna quantidade de alunos na turma."""
        from apps.enrollments.models import Enrollment
        return Enrollment.objects.filter(
            class_obj=self,
            status='active',
        ).count()

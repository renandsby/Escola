from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class AttendanceStatus(models.TextChoices):
    PRESENT = 'PRESENT', _('Presente')
    ABSENT = 'ABSENT', _('Ausente')
    EXCUSED_ABSENCE = 'EXCUSED_ABSENCE', _('Falta justificada')


class Attendance(BaseModel):
    """Frequência escolar diária vinculada à matrícula."""

    enrollment = models.ForeignKey(
        'students.Enrollment',
        on_delete=models.CASCADE,
        related_name='attendances',
        verbose_name=_('Matrícula'),
    )
    school_class = models.ForeignKey(
        'classes.SchoolClass',
        on_delete=models.CASCADE,
        related_name='attendances',
        verbose_name=_('Turma'),
    )
    subject = models.ForeignKey(
        'curriculum.Subject',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attendances',
        verbose_name=_('Disciplina'),
    )
    date = models.DateField(verbose_name=_('Data'))
    status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        verbose_name=_('Status'),
    )
    justification_note = models.TextField(blank=True, verbose_name=_('Justificativa'))

    class Meta:
        verbose_name = _('Frequência')
        verbose_name_plural = _('Frequências')
        constraints = [
            models.UniqueConstraint(
                fields=['enrollment', 'date', 'subject'],
                name='uq_attendance_entry',
            ),
        ]
        indexes = [
            models.Index(fields=['enrollment', 'date']),
            models.Index(fields=['date', 'status']),
        ]

    def __str__(self):
        return f"{self.enrollment.student} — {self.date} ({self.get_status_display()})"

    @property
    def observation(self):
        return self.justification_note

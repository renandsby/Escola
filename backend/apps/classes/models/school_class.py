from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import SoftDeleteModel


class Shift(models.TextChoices):
    MORNING = 'MORNING', _('Manhã')
    AFTERNOON = 'AFTERNOON', _('Tarde')
    FULL_TIME = 'FULL_TIME', _('Integral')
    NIGHT = 'NIGHT', _('Noite')


#: Turnos que ocupam o docente ao mesmo tempo (conflito de agenda).
SHIFT_OVERLAPS: dict[str, set[str]] = {
    Shift.MORNING: {Shift.MORNING, Shift.FULL_TIME},
    Shift.AFTERNOON: {Shift.AFTERNOON, Shift.FULL_TIME},
    Shift.NIGHT: {Shift.NIGHT},
    Shift.FULL_TIME: {Shift.MORNING, Shift.AFTERNOON, Shift.FULL_TIME},
}


def shifts_conflict(shift_a: str, shift_b: str) -> bool:
    """True se um docente não pode cobrir ``shift_a`` e ``shift_b`` simultaneamente."""
    return shift_b in SHIFT_OVERLAPS.get(shift_a, {shift_a})


class SchoolClass(SoftDeleteModel):
    """Turma da escola vinculada a ano letivo e matriz curricular."""

    school = models.ForeignKey(
        'schools.School',
        on_delete=models.PROTECT,
        related_name='school_classes',
        verbose_name=_('Escola'),
    )
    academic_year = models.ForeignKey(
        'governance.AcademicYear',
        on_delete=models.PROTECT,
        related_name='school_classes',
        verbose_name=_('Ano Letivo'),
    )
    curriculum_matrix = models.ForeignKey(
        'curriculum.CurriculumMatrix',
        on_delete=models.PROTECT,
        related_name='school_classes',
        verbose_name=_('Matriz Curricular'),
    )
    name = models.CharField(max_length=50, verbose_name=_('Nome'))
    shift = models.CharField(max_length=20, choices=Shift.choices, verbose_name=_('Turno'))
    max_capacity = models.PositiveIntegerField(default=30, verbose_name=_('Capacidade máxima'))
    room_number = models.CharField(max_length=20, blank=True, verbose_name=_('Sala'))
    inep_class_code = models.CharField(max_length=20, blank=True, verbose_name=_('Código INEP da turma'))
    classroom = models.ForeignKey(
        'classes.Classroom',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='school_classes',
        verbose_name=_('Sala de Aula'),
    )

    class Meta:
        verbose_name = _('Turma')
        verbose_name_plural = _('Turmas')
        indexes = [
            models.Index(fields=['school', 'academic_year']),
            models.Index(fields=['school', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} — {self.school.name}"

    def get_student_count(self):
        from apps.students.models import Enrollment, EnrollmentStatus

        return Enrollment.objects.filter(
            school_class=self,
            status=EnrollmentStatus.ENROLLED,
        ).count()

    def delete(self, using=None, keep_parents=False):
        self.soft_delete()


# Alias legado para imports que ainda referenciem Class
Class = SchoolClass

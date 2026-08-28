import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import SoftDeleteModel


class TeacherProfile(SoftDeleteModel):
    """Perfil docente do quadro municipal."""

    user = models.OneToOneField(
        'core.User',
        on_delete=models.CASCADE,
        related_name='teacher_profile',
        verbose_name=_('Usuário'),
    )
    education_department = models.ForeignKey(
        'governance.EducationDepartment',
        on_delete=models.PROTECT,
        related_name='teachers',
        verbose_name=_('Secretaria'),
    )
    registration_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_('Matrícula funcional'),
    )
    cpf = models.CharField(max_length=11, unique=True, verbose_name=_('CPF'))
    formation_area = models.CharField(max_length=150, blank=True, verbose_name=_('Área de formação'))
    birth_date = models.DateField(null=True, blank=True, verbose_name=_('Data de Nascimento'))
    hiring_date = models.DateField(null=True, blank=True, verbose_name=_('Data de Contratação'))

    class Meta:
        verbose_name = _('Perfil Docente')
        verbose_name_plural = _('Perfis Docentes')
        indexes = [
            models.Index(fields=['education_department', 'is_active']),
            models.Index(fields=['cpf']),
        ]

    def __str__(self):
        return f"Prof. {self.user.get_full_name()}"

    def delete(self, using=None, keep_parents=False):
        self.soft_delete()


class TeacherAllocation(models.Model):
    """Alocação do docente em turma/disciplina (multi-escola)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher_profile = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name='allocations',
        verbose_name=_('Professor'),
    )
    school_class = models.ForeignKey(
        'classes.SchoolClass',
        on_delete=models.CASCADE,
        related_name='teacher_allocations',
        verbose_name=_('Turma'),
    )
    subject = models.ForeignKey(
        'curriculum.Subject',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='teacher_allocations',
        verbose_name=_('Disciplina'),
    )
    is_regent = models.BooleanField(default=False, verbose_name=_('Regente'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Criado em'))

    class Meta:
        verbose_name = _('Alocação Docente')
        verbose_name_plural = _('Alocações Docentes')
        constraints = [
            models.UniqueConstraint(
                fields=['teacher_profile', 'school_class', 'subject'],
                name='uq_allocation',
            ),
        ]

    def __str__(self):
        subject = self.subject.name if self.subject else 'Regente'
        return f"{self.teacher_profile} → {self.school_class} ({subject})"


Teacher = TeacherProfile

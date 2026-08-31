"""DX-SGE-003/2026 — Fase 5: auditoria de integridade de CPF.

Verifica:
- CPF de `User` inválido (dígitos verificadores).
- CPF de `Student` inválido.
- Divergência entre o CPF de um perfil (aluno/docente/responsável) e o CPF do
  `User` vinculado a ele.

Sai com código 1 se encontrar qualquer problema (uso em CI).
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from core.models import User
from core.validators import is_valid_cpf, normalize_cpf
from apps.classes.models import TeacherProfile
from apps.students.models import Guardian, Student


class Command(BaseCommand):
    help = 'Audita CPF de usuários/alunos e divergências perfil ↔ usuário.'

    def handle(self, *args, **options):
        problems: list[str] = []

        for user in User.objects.exclude(cpf__isnull=True).exclude(cpf='').iterator():
            if not is_valid_cpf(user.cpf):
                problems.append(f'User {user.pk} ({user.email}): CPF inválido "{user.cpf}"')

        for student in Student.objects.filter(
            deleted_at__isnull=True
        ).exclude(cpf__isnull=True).exclude(cpf='').iterator():
            if not is_valid_cpf(student.cpf):
                problems.append(
                    f'Student {student.pk} ({student.full_name}): CPF inválido "{student.cpf}"'
                )

        problems += self._profile_mismatch(Student, 'Student')
        problems += self._profile_mismatch(TeacherProfile, 'TeacherProfile')
        problems += self._profile_mismatch(Guardian, 'Guardian')

        if problems:
            self.stdout.write(self.style.ERROR(f'{len(problems)} problema(s):'))
            for p in problems:
                self.stdout.write(f'  - {p}')
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS('Integridade de CPF OK.'))

    @staticmethod
    def _profile_mismatch(model, label):
        out = []
        qs = model.objects.filter(user__isnull=False).select_related('user')
        for obj in qs.exclude(cpf__isnull=True).exclude(cpf='').iterator():
            if not obj.user.cpf:
                continue
            if normalize_cpf(obj.cpf) != normalize_cpf(obj.user.cpf):
                out.append(
                    f'{label} {obj.pk}: CPF "{obj.cpf}" ≠ CPF do usuário "{obj.user.cpf}"'
                )
        return out

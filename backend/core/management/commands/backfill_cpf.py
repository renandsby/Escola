"""DX-SGE-003/2026 — Fase 5: backfill de CPF de usuários e alunos.

Preenche `User.cpf` e `Student.cpf` faltantes a partir dos perfis vinculados e
relata as pendências e conflitos que precisam de resolução manual **antes** de
aplicar as migrações `NOT NULL`.

    python manage.py backfill_cpf --report      # dry-run (padrão)
    python manage.py backfill_cpf --commit      # aplica o backfill
"""

from __future__ import annotations

from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import User
from core.validators import is_valid_cpf, normalize_cpf
from apps.students.models import Student


class Command(BaseCommand):
    help = 'Backfill de CPF de usuários e alunos + relatório de pendências.'

    def add_arguments(self, parser):
        parser.add_argument('--commit', action='store_true', help='Aplica as alterações.')
        parser.add_argument('--report', action='store_true', help='Somente relatório (padrão).')

    def handle(self, *args, **options):
        commit = options['commit']
        self.stdout.write(self.style.MIGRATE_HEADING(
            'Backfill de CPF — modo %s' % ('COMMIT' if commit else 'DRY-RUN')
        ))

        with transaction.atomic():
            user_filled, user_pending = self._backfill_users(commit)
            student_filled, student_pending = self._backfill_students(commit)
            user_conflicts = self._conflicts(User, 'usuário')
            student_conflicts = self._conflicts(Student, 'aluno', active_only=True)
            if not commit:
                transaction.set_rollback(True)

        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('Resumo'))
        self.stdout.write(f'  Usuários preenchidos: {user_filled}')
        self.stdout.write(f'  Alunos preenchidos:   {student_filled}')
        self._report('Usuários sem CPF (pendentes)', user_pending)
        self._report('Alunos sem CPF (pendentes)', student_pending)
        self._report('CPF duplicado entre usuários', user_conflicts)
        self._report('CPF duplicado entre alunos ativos', student_conflicts)

        pending_total = (
            len(user_pending) + len(student_pending)
            + len(user_conflicts) + len(student_conflicts)
        )
        if pending_total:
            self.stdout.write(self.style.WARNING(
                f'\n{pending_total} pendência(s) — resolva antes das migrações NOT NULL.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('\nSem pendências. Pode aplicar as migrações NOT NULL.'))

    # ------------------------------------------------------------------ users
    def _backfill_users(self, commit):
        filled, pending = 0, []
        qs = User.objects.filter(cpf__isnull=True) | User.objects.filter(cpf='')
        for user in qs.distinct().iterator():
            candidate = None
            for attr in ('student_profile', 'teacher_profile', 'guardian_profile'):
                profile = getattr(user, attr, None)
                if profile is not None and getattr(profile, 'cpf', None):
                    candidate = normalize_cpf(profile.cpf)
                    break
            if candidate and is_valid_cpf(candidate):
                user.cpf = candidate
                if not user.username or user.username == '':
                    user.username = candidate
                if commit:
                    user.save(update_fields=['cpf', 'username'])
                filled += 1
            else:
                pending.append(f'{user.pk} · {user.get_full_name() or user.email} · {user.role}')
        return filled, pending

    # --------------------------------------------------------------- students
    def _backfill_students(self, commit):
        filled, pending = 0, []
        qs = Student.objects.filter(deleted_at__isnull=True).filter(
            cpf__isnull=True
        ) | Student.objects.filter(deleted_at__isnull=True).filter(cpf='')
        for student in qs.distinct().select_related('user').iterator():
            candidate = None
            if student.user_id and student.user.cpf:
                candidate = normalize_cpf(student.user.cpf)
            if candidate and is_valid_cpf(candidate):
                student.cpf = candidate
                if commit:
                    student.save(update_fields=['cpf'])
                filled += 1
            else:
                pending.append(f'{student.pk} · {student.full_name} · MUN {student.unique_municipal_id}')
        return filled, pending

    # -------------------------------------------------------------- conflitos
    @staticmethod
    def _conflicts(model, label, active_only=False):
        qs = model.objects.exclude(cpf__isnull=True).exclude(cpf='')
        if active_only:
            qs = qs.filter(deleted_at__isnull=True)
        counts = Counter(qs.values_list('cpf', flat=True))
        return [f'{cpf} ({n} {label}s)' for cpf, n in counts.items() if n > 1]

    def _report(self, title, rows):
        if not rows:
            return
        self.stdout.write(self.style.WARNING(f'\n  {title}: {len(rows)}'))
        for row in rows[:200]:
            self.stdout.write(f'    - {row}')
        if len(rows) > 200:
            self.stdout.write(f'    … +{len(rows) - 200}')

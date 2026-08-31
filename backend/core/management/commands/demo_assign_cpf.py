"""Atribui CPFs fictícios **válidos** aos cadastros de pessoas — uso em
demonstração / ambiente de apresentação.

Regras:
- Substitui apenas CPFs ausentes ou com dígito verificador inválido.
- Quando o registro (aluno/responsável/docente) tem ``user`` vinculado, o CPF do
  perfil passa a **espelhar o CPF do usuário** (mantém o login intacto e a
  integridade perfil↔usuário).
- Sem ``user``: gera um CPF sintético válido e único.

    python manage.py demo_assign_cpf            # dry-run
    python manage.py demo_assign_cpf --commit
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import User
from core.validators import generate_cpf, is_valid_cpf, normalize_cpf
from apps.classes.models import TeacherProfile
from apps.students.models import Guardian, Student


class Command(BaseCommand):
    help = 'Preenche CPFs fictícios válidos nos cadastros de pessoas (demo).'

    def add_arguments(self, parser):
        parser.add_argument('--commit', action='store_true', help='Aplica as alterações.')
        parser.add_argument(
            '--regen-all',
            action='store_true',
            help='Regera o CPF de TODOS os registros (não só os inválidos).',
        )

    def handle(self, *args, **options):
        from django.conf import settings

        if settings.IS_PRODUCTION:
            raise CommandError('Recusado: ENVIRONMENT=production.')

        commit = options['commit']
        regen_all = options['regen_all']
        self.stdout.write(self.style.MIGRATE_HEADING(
            'CPF de demonstração — modo %s%s'
            % ('COMMIT' if commit else 'DRY-RUN', ' (REGEN-ALL)' if regen_all else '')
        ))

        with transaction.atomic():
            taken: set[str] = set() if regen_all else self._all_taken()
            seq = _Counter(1)

            def fresh():
                while True:
                    cpf = generate_cpf(seq.next())
                    if cpf not in taken:
                        taken.add(cpf)
                        return cpf

            users = self._fix_users(taken, fresh, commit, regen_all)
            students = self._fix_profiles(Student, 'aluno', taken, fresh, commit, regen_all)
            guardians = self._fix_profiles(Guardian, 'responsável', taken, fresh, commit, regen_all)
            teachers = self._fix_profiles(TeacherProfile, 'docente', taken, fresh, commit, regen_all)

            if not commit:
                transaction.set_rollback(True)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Usuários: {users} · Alunos: {students} · Responsáveis: {guardians} · Docentes: {teachers}'
        ))
        if not commit:
            self.stdout.write(self.style.WARNING('DRY-RUN — nada gravado. Use --commit.'))

    # ------------------------------------------------------------------ #

    @staticmethod
    def _all_taken() -> set[str]:
        taken: set[str] = set()
        for model, active_only in (
            (User, False),
            (Student, True),
            (Guardian, True),
            (TeacherProfile, True),
        ):
            qs = model.objects.all()
            if active_only:
                qs = qs.filter(deleted_at__isnull=True)
            taken.update(
                v for v in qs.values_list('cpf', flat=True) if v and is_valid_cpf(v)
            )
        return taken

    def _fix_users(self, taken, fresh, commit, regen_all) -> int:
        fixed = 0
        # username == cpf: preserva se o username não era o CPF (contas nomeadas).
        for user in User.objects.all().iterator():
            if not regen_all and is_valid_cpf(user.cpf):
                continue
            new_cpf = fresh()
            if commit:
                keep_username = user.username != user.cpf
                user.cpf = new_cpf
                if not keep_username:
                    user.username = new_cpf
                user.save(update_fields=['cpf', 'username'])
            fixed += 1
        return fixed

    def _fix_profiles(self, model, label, taken, fresh, commit, regen_all) -> int:
        fixed = 0
        qs = model.objects.filter(deleted_at__isnull=True).select_related('user')
        for obj in qs.iterator():
            consistent = not obj.user_id or normalize_cpf(obj.cpf) == normalize_cpf(obj.user.cpf)
            if not regen_all and is_valid_cpf(obj.cpf) and consistent:
                continue
            if obj.user_id and is_valid_cpf(obj.user.cpf):
                new_cpf = normalize_cpf(obj.user.cpf)  # espelha o usuário
            else:
                new_cpf = fresh()
            if commit:
                obj.cpf = new_cpf
                obj.save(update_fields=['cpf'])
            fixed += 1
        return fixed


class _Counter:
    def __init__(self, start: int):
        self._n = start

    def next(self) -> int:
        n = self._n
        self._n += 1
        return n

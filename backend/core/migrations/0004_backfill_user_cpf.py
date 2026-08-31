"""DX-SGE-003/2026 — Fase 5a: preenche `User.cpf` faltante.

- Copia o CPF de um perfil vinculado (aluno/docente/responsável), quando válido
  e livre.
- Fora de produção, gera um CPF sintético **válido** para o que sobrar (dados de
  dev/staging), e desduplica.
- Em produção, aborta com instrução de rodar ``manage.py backfill_cpf`` e
  resolver as pendências manualmente.
"""

from django.conf import settings
from django.db import migrations, models


def _forwards(apps, schema_editor):
    from core.validators import generate_cpf, is_valid_cpf, normalize_cpf

    User = apps.get_model('core', 'User')

    taken = set(
        User.objects.exclude(cpf__isnull=True).exclude(cpf='').values_list('cpf', flat=True)
    )
    seq = [1]

    def fresh_cpf():
        while True:
            cpf = generate_cpf(seq[0])
            seq[0] += 1
            if cpf not in taken:
                taken.add(cpf)
                return cpf

    missing = list(
        User.objects.filter(models.Q(cpf__isnull=True) | models.Q(cpf=''))
        .select_related('student_profile', 'teacher_profile', 'guardian_profile')
    )

    still_missing = []
    for user in missing:
        candidate = None
        for attr in ('student_profile', 'teacher_profile', 'guardian_profile'):
            profile = getattr(user, attr, None)
            raw = getattr(profile, 'cpf', None) if profile is not None else None
            if raw:
                norm = normalize_cpf(raw)
                if is_valid_cpf(norm) and norm not in taken:
                    candidate = norm
                    break
        if candidate:
            user.cpf = candidate
            user.username = user.username or candidate
            user.save(update_fields=['cpf', 'username'])
            taken.add(candidate)
        else:
            still_missing.append(user)

    # duplicados pré-existentes (mesmo CPF em >1 usuário)
    dupes = [
        cpf
        for cpf, n in _count(User.objects.exclude(cpf__isnull=True).exclude(cpf=''))
        if n > 1
    ]

    if settings.IS_PRODUCTION and (still_missing or dupes):
        raise RuntimeError(
            f'{len(still_missing)} usuário(s) sem CPF e {len(dupes)} CPF(s) duplicado(s). '
            'Rode `python manage.py backfill_cpf --commit`, resolva as pendências '
            'e reaplique a migração.'
        )

    for user in still_missing:
        cpf = fresh_cpf()
        user.cpf = cpf
        user.username = user.username or cpf
        user.save(update_fields=['cpf', 'username'])

    for cpf in dupes:
        rows = list(User.objects.filter(cpf=cpf).order_by('created_at'))
        for extra in rows[1:]:
            new_cpf = fresh_cpf()
            extra.cpf = new_cpf
            extra.username = new_cpf
            extra.save(update_fields=['cpf', 'username'])


def _count(qs):
    from collections import Counter

    return Counter(qs.values_list('cpf', flat=True)).items()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_user_document_to_cpf'),
    ]

    operations = [
        migrations.RunPython(_forwards, migrations.RunPython.noop),
    ]

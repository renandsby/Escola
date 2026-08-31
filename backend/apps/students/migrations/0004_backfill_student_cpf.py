"""DX-SGE-003/2026 — Fase 5a: preenche `Student.cpf` faltante.

- Copia o CPF do usuário vinculado, quando válido e livre.
- Fora de produção, gera CPF sintético válido para o restante e desduplica.
- Em produção, aborta com instrução de rodar ``manage.py backfill_cpf``.
"""

from django.conf import settings
from django.db import migrations, models


def _forwards(apps, schema_editor):
    from collections import Counter

    from core.validators import generate_cpf, is_valid_cpf, normalize_cpf

    Student = apps.get_model('students', 'Student')
    active = Student.objects.filter(deleted_at__isnull=True)

    taken = set(
        Student.objects.exclude(cpf__isnull=True).exclude(cpf='').values_list('cpf', flat=True)
    )
    seq = [10_000]

    def fresh_cpf():
        while True:
            cpf = generate_cpf(seq[0])
            seq[0] += 1
            if cpf not in taken:
                taken.add(cpf)
                return cpf

    missing = list(
        active.filter(models.Q(cpf__isnull=True) | models.Q(cpf='')).select_related('user')
    )
    still_missing = []
    for student in missing:
        raw = student.user.cpf if student.user_id else None
        norm = normalize_cpf(raw) if raw else None
        if norm and is_valid_cpf(norm) and norm not in taken:
            student.cpf = norm
            student.save(update_fields=['cpf'])
            taken.add(norm)
        else:
            still_missing.append(student)

    dupes = [
        cpf
        for cpf, n in Counter(
            active.exclude(cpf__isnull=True).exclude(cpf='').values_list('cpf', flat=True)
        ).items()
        if n > 1
    ]

    if settings.IS_PRODUCTION and (still_missing or dupes):
        raise RuntimeError(
            f'{len(still_missing)} aluno(s) ativo(s) sem CPF e {len(dupes)} CPF(s) '
            'duplicado(s). Rode `python manage.py backfill_cpf --commit` e resolva '
            'as pendências antes de reaplicar.'
        )

    for student in still_missing:
        student.cpf = fresh_cpf()
        student.save(update_fields=['cpf'])

    for cpf in dupes:
        rows = list(active.filter(cpf=cpf).order_by('created_at'))
        for extra in rows[1:]:
            extra.cpf = fresh_cpf()
            extra.save(update_fields=['cpf'])


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0003_cpf_fields'),
    ]

    operations = [
        migrations.RunPython(_forwards, migrations.RunPython.noop),
    ]

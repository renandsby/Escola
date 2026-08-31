"""DX-SGE-003/2026 — Fase 3: `User.document` -> `User.cpf`.

Renomeia o campo, troca para `core.fields.CPFField`, normaliza os valores
existentes (só dígitos) e reindexa. O campo continua `null=True` aqui; a
obrigatoriedade entra na Fase 5 (após backfill).
"""

import core.fields
from django.db import migrations, models


def normalize_existing_cpf(apps, schema_editor):
    from core.validators import normalize_cpf

    User = apps.get_model('core', 'User')
    for user in User.objects.exclude(cpf__isnull=True).exclude(cpf='').iterator():
        normalized = normalize_cpf(user.cpf)
        if normalized != user.cpf:
            user.cpf = normalized
            user.save(update_fields=['cpf'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_initial'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='user',
            name='core_user_documen_e9ec86_idx',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='document',
            new_name='cpf',
        ),
        migrations.AlterField(
            model_name='user',
            name='cpf',
            field=core.fields.CPFField(
                blank=True, null=True, unique=True, verbose_name='CPF'
            ),
        ),
        migrations.RunPython(normalize_existing_cpf, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['cpf'], name='core_user_cpf_idx'),
        ),
    ]

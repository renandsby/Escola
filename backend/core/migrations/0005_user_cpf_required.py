"""DX-SGE-003/2026 — Fase 5b: `User.cpf` obrigatório."""

import core.fields
from django.db import migrations


def guard(apps, schema_editor):
    User = apps.get_model('core', 'User')
    missing = (
        User.objects.filter(cpf__isnull=True).count()
        + User.objects.filter(cpf='').count()
    )
    if missing:
        raise RuntimeError(
            f'{missing} usuário(s) sem CPF. A migração de backfill '
            '(0004) precisa rodar antes.'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_backfill_user_cpf'),
    ]

    operations = [
        migrations.RunPython(guard, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='cpf',
            field=core.fields.CPFField(unique=True, verbose_name='CPF'),
        ),
    ]

"""DX-SGE-003/2026 — Fase 5b: `Student.cpf` obrigatório + constraint simplificada."""

import core.fields
from django.db import migrations, models


def guard(apps, schema_editor):
    Student = apps.get_model('students', 'Student')
    missing = (
        Student.objects.filter(deleted_at__isnull=True, cpf__isnull=True).count()
        + Student.objects.filter(deleted_at__isnull=True, cpf='').count()
    )
    if missing:
        raise RuntimeError(
            f'{missing} aluno(s) ativo(s) sem CPF. A migração de backfill (0004) '
            'precisa rodar antes.'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0004_backfill_student_cpf'),
    ]

    operations = [
        migrations.RunPython(guard, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name='student',
            name='uq_student_cpf_active',
        ),
        migrations.AlterField(
            model_name='student',
            name='cpf',
            field=core.fields.CPFField(verbose_name='CPF'),
        ),
        migrations.AddConstraint(
            model_name='student',
            constraint=models.UniqueConstraint(
                fields=['cpf'],
                condition=models.Q(deleted_at__isnull=True),
                name='uq_student_cpf_active',
            ),
        ),
    ]

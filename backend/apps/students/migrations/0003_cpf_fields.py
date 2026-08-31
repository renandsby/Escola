"""DX-SGE-003/2026 — Fase 4: CPF de `Student` e `Guardian`.

- `Student.cpf`: `CPFField` (normaliza + valida); deixa de ter `unique=True`
  simples e ganha `UniqueConstraint` condicional (só entre alunos não
  deletados). Continua `null=True` — a obrigatoriedade entra na Fase 5.
- `Guardian.cpf`: `CPFField` (normaliza + valida); unicidade inalterada.
"""

import core.fields
from django.db import migrations, models


def normalize_cpf(apps, schema_editor):
    from core.validators import normalize_cpf as _norm

    for model_name in ('Student', 'Guardian'):
        Model = apps.get_model('students', model_name)
        for obj in Model.objects.exclude(cpf__isnull=True).exclude(cpf='').iterator():
            normalized = _norm(obj.cpf)
            if normalized != obj.cpf:
                obj.cpf = normalized
                obj.save(update_fields=['cpf'])


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0002_transferrequest_target_enrollment'),
    ]

    operations = [
        migrations.AlterField(
            model_name='student',
            name='cpf',
            field=core.fields.CPFField(blank=True, null=True, verbose_name='CPF'),
        ),
        migrations.AlterField(
            model_name='guardian',
            name='cpf',
            field=core.fields.CPFField(unique=True, verbose_name='CPF'),
        ),
        migrations.RunPython(normalize_cpf, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='student',
            constraint=models.UniqueConstraint(
                fields=['cpf'],
                condition=models.Q(deleted_at__isnull=True, cpf__isnull=False),
                name='uq_student_cpf_active',
            ),
        ),
    ]

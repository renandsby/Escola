"""DX-SGE-003/2026 — Fase 4: `TeacherProfile.cpf` passa a `core.fields.CPFField`
(normalização + validação de dígito verificador). Unicidade inalterada."""

import core.fields
from django.db import migrations


def normalize_cpf(apps, schema_editor):
    from core.validators import normalize_cpf as _norm

    TeacherProfile = apps.get_model('classes', 'TeacherProfile')
    for tp in TeacherProfile.objects.exclude(cpf__isnull=True).exclude(cpf='').iterator():
        normalized = _norm(tp.cpf)
        if normalized != tp.cpf:
            tp.cpf = normalized
            tp.save(update_fields=['cpf'])


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='teacherprofile',
            name='cpf',
            field=core.fields.CPFField(unique=True, verbose_name='CPF'),
        ),
        migrations.RunPython(normalize_cpf, migrations.RunPython.noop),
    ]

"""Remove o arquivo das execuções expiradas mantendo o registro (auditoria).

Rodar diariamente (cron). PLANO_EXECUCAO_DASHBOARD §3.1.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.reports.models import ReportExecution


class Command(BaseCommand):
    help = 'Apaga o arquivo das execuções de relatório expiradas (mantém o registro).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **opt):
        expired = ReportExecution.objects.filter(
            expires_at__lte=timezone.now()
        ).exclude(file='')

        count = 0
        for execution in expired.iterator():
            if not execution.file:
                continue
            if opt['dry_run']:
                self.stdout.write(f'  [dry-run] apagaria {execution.file.name}')
            else:
                execution.file.delete(save=False)
                execution.file = None
                execution.save(update_fields=['file'])
            count += 1

        verb = 'seriam apagados' if opt['dry_run'] else 'apagados'
        self.stdout.write(self.style.SUCCESS(f'{count} arquivo(s) {verb}.'))

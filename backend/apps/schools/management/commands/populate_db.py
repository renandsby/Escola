from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Depreciado: use seed_municipal. Redireciona automaticamente.'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.WARNING(
                'populate_db foi substituído por seed_municipal (modelo SME).'
            )
        )
        from django.core.management import call_command

        call_command('seed_municipal')

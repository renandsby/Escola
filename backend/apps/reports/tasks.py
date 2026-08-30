"""Geração assíncrona de relatórios (PLANO_EXECUCAO_DASHBOARD §3.5).

Roda na infra Celery já existente. `max_retries=2` só para falha de
infraestrutura — erro de negócio marca a execução como ERROR e retorna.
"""

from celery import shared_task


@shared_task(
    bind=True,
    name='reports.generate_report',
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
)
def generate_report(self, execution_id: str):
    from apps.reports.services.executions import run_execution

    try:
        run_execution(execution_id)
    except Exception as exc:  # falha inesperada de infra → retry limitado
        raise self.retry(exc=exc)

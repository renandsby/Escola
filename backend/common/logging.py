import logging
import json
import sys
from typing import Any, Dict
from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Formatter customizado para logs em JSON."""

    def add_fields(
        self,
        log_record: Dict[str, Any],
        record: logging.LogRecord,
        message_dict: Dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record['timestamp'] = self.formatTime(record)
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno

        # Adicionar informações de exceção se houver
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)


def setup_logging(debug: bool = False) -> logging.Logger:
    """Configura logging estruturado para a aplicação.

    Args:
        debug: Se True, usa formato legível; se False, usa JSON.

    Returns:
        Logger configurado.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if debug else logging.INFO)

    # Remover handlers existentes
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)

    if debug:
        # Formato legível para desenvolvimento
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
        )
    else:
        # Formato JSON para produção
        formatter = CustomJsonFormatter()

    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Obtém um logger com nome específico.

    Args:
        name: Nome do módulo/logger.

    Returns:
        Logger instance.
    """
    return logging.getLogger(name)

"""Registry dos geradores. Cada módulo expõe ``generate(ctx) -> GeneratedFile``."""

from importlib import import_module

from .base import GeneratedFile, ReportContext, ReportGenerationError, ReportScope

_MODULES = {
    'class_report_card',
    'final_results_record',
    'attendance_bolsa_familia',
    'students_below_minimum',
    'educacenso_export',
    'school_performance_panel',
    'enrollment_movement',
    'descriptive_reports',
    'teacher_allocation',
}


def get_generator(name: str):
    if name not in _MODULES:
        raise ReportGenerationError('INVALID_REPORT_PARAMS', f'Gerador desconhecido: {name}')
    return import_module(f'{__name__}.{name}').generate


__all__ = [
    'get_generator',
    'GeneratedFile',
    'ReportContext',
    'ReportScope',
    'ReportGenerationError',
]

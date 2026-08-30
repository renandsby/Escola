"""Contexto institucional para a casca do frontend (AppHeader do DS "Rede").

Somente leitura, disponível para **qualquer usuário autenticado** — ao contrário
do painel gerencial (`overview.py`), que é restrito à gestão. Resolve o município
da rede e o período letivo corrente a partir do escopo do usuário (secretaria
própria, ou a secretaria da escola vinculada).
"""

from __future__ import annotations

from apps.governance.models import EducationDepartment

from .overview import _current_period, _current_year, _department_id


def get_network_context(*, user) -> dict:
    dept_id = _department_id(user)
    municipality_name = None
    if dept_id:
        municipality_name = (
            EducationDepartment.objects.filter(id=dept_id)
            .values_list('municipality_name', flat=True)
            .first()
        )

    year = _current_year(dept_id)
    period = _current_period(year, None)

    return {
        'municipality_name': municipality_name,
        'academic_year': year.year if year else None,
        'term': period.period_number if period else None,
        'term_label': period.name if period else None,
        'grade_deadline': period.grade_deadline.isoformat() if period else None,
    }

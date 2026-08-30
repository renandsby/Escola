"""Catálogo de relatórios — fonte única de verdade (PLANO_EXECUCAO_DASHBOARD §3.2).

Exposto ao frontend por ``GET /api/v1/reports/catalog/``. O frontend **não**
mantém lista própria.
"""

from __future__ import annotations

from dataclasses import dataclass

SME = ('sme_admin', 'sme_supervisor')
SCHOOL = ('school_director', 'school_secretary')
TEACHER = ('teacher',)


@dataclass(frozen=True)
class ReportDef:
    key: str
    name: str
    description: str
    scopes: tuple[str, ...]          # ("network", "school", "class")
    formats: tuple[str, ...]         # ("PDF", "XLSX", "CSV", "TXT")
    roles: tuple[str, ...]
    contains_personal_data: bool
    parameters: tuple[str, ...]      # nomes dos campos do formulário (§3.3)
    generator: str                   # dotted path relativo a apps.reports.generators
    tone: str = 'neutral'
    estimate_seconds: int = 20


_COMMON = ('coverage', 'academic_year', 'term', 'output_format')

REPORT_CATALOG: tuple[ReportDef, ...] = (
    ReportDef(
        key='class_report_card',
        name='Boletim consolidado por turma',
        description='Notas, faltas e situação por aluno, com assinatura da direção.',
        scopes=('class',),
        formats=('PDF',),
        roles=SME + SCHOOL + TEACHER,
        contains_personal_data=True,
        parameters=_COMMON,
        generator='class_report_card',
        tone='neutral',
        estimate_seconds=25,
    ),
    ReportDef(
        key='final_results_record',
        name='Ata de resultados finais',
        description='Documento oficial de aprovação e reprovação ao fim do ano letivo.',
        scopes=('class', 'school'),
        formats=('PDF',),
        roles=SME + SCHOOL,
        contains_personal_data=True,
        parameters=_COMMON,
        generator='final_results_record',
        estimate_seconds=30,
    ),
    ReportDef(
        key='attendance_bolsa_familia',
        name='Frequência mensal — Programa Bolsa Família',
        description='Layout exigido pelo MEC/MDS para o acompanhamento de condicionalidades.',
        scopes=('network', 'school'),
        formats=('PDF', 'CSV'),
        roles=SME + SCHOOL,
        contains_personal_data=True,
        parameters=_COMMON + ('include_student_list',),
        generator='attendance_bolsa_familia',
        estimate_seconds=40,
    ),
    ReportDef(
        key='students_below_minimum',
        name='Alunos abaixo de 75% de frequência',
        description='Lista nominal com escola, turma, percentual e situação.',
        scopes=('network', 'school', 'class'),
        formats=('XLSX', 'PDF'),
        roles=SME + SCHOOL,
        contains_personal_data=True,
        parameters=_COMMON + ('include_student_list',),
        generator='students_below_minimum',
        tone='danger',
        estimate_seconds=35,
    ),
    ReportDef(
        key='educacenso_export',
        name='Exportação Educacenso',
        description='Arquivo no layout do INEP com validação prévia de campos obrigatórios.',
        scopes=('network',),
        formats=('TXT',),
        roles=SME,
        contains_personal_data=True,
        parameters=('academic_year', 'output_format'),
        generator='educacenso_export',
        estimate_seconds=60,
    ),
    ReportDef(
        key='school_performance_panel',
        name='Painel de rendimento por escola',
        description='Este painel em PDF, com os gráficos e o comparativo entre escolas.',
        scopes=('network',),
        formats=('PDF', 'XLSX'),
        roles=SME,
        contains_personal_data=False,
        parameters=_COMMON + ('include_charts', 'include_school_comparison'),
        generator='school_performance_panel',
        estimate_seconds=45,
    ),
    ReportDef(
        key='enrollment_movement',
        name='Movimentação de matrículas e transferências',
        description='Entradas, saídas, evasão e tempo de tramitação por escola.',
        scopes=('network', 'school'),
        formats=('XLSX',),
        roles=SME + SCHOOL,
        contains_personal_data=False,
        parameters=_COMMON,
        generator='enrollment_movement',
        estimate_seconds=30,
    ),
    ReportDef(
        key='descriptive_reports',
        name='Pareceres descritivos por turma',
        description='Compilado dos pareceres descritivos da Educação Infantil / AEE.',
        scopes=('class',),
        formats=('PDF',),
        roles=SME + SCHOOL + TEACHER,
        contains_personal_data=True,
        parameters=_COMMON,
        generator='descriptive_reports',
        tone='qual',
        estimate_seconds=25,
    ),
    ReportDef(
        key='teacher_allocation',
        name='Quadro de lotação de professores',
        description='Alocações por escola, disciplina e turno, com carga horária e conflitos.',
        scopes=('network', 'school'),
        formats=('XLSX',),
        roles=SME + SCHOOL,
        contains_personal_data=False,
        parameters=_COMMON,
        generator='teacher_allocation',
        estimate_seconds=25,
    ),
)

_BY_KEY = {d.key: d for d in REPORT_CATALOG}


def get_report_def(key: str) -> ReportDef | None:
    return _BY_KEY.get(key)


def catalog_for_role(role: str) -> list[ReportDef]:
    return [d for d in REPORT_CATALOG if role in d.roles]

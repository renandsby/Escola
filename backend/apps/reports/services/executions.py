"""Criação e execução de relatórios (PLANO_EXECUCAO_DASHBOARD §3).

- resolve e **autoriza** o escopo a partir do papel (R1 / §2.2 / §3.6);
- valida os parâmetros do formulário (§3.3) → ``INVALID_REPORT_PARAMS``;
- aplica o rate-limit de 5 execuções em curso por usuário → ``REPORT_RATE_LIMITED``;
- roda o gerador de forma assíncrona e grava auditoria quando há dado pessoal.
"""

from __future__ import annotations

from django.utils import timezone

from apps.classes.selectors.school_classes import get_school_classes_for_user
from apps.governance.models import AcademicPeriod, AcademicYear, AcademicYearStatus
from core.exceptions import BusinessLogicError
from core.models import UserRole

from apps.reports.catalog import ReportDef, get_report_def
from apps.reports.generators import ReportGenerationError, ReportScope, get_generator
from apps.reports.models import ReportExecution, ReportExecutionStatus

SME_ROLES = {UserRole.SME_ADMIN, UserRole.SME_SUPERVISOR}
SCHOOL_ROLES = {UserRole.SCHOOL_DIRECTOR, UserRole.SCHOOL_SECRETARY}
MAX_IN_PROGRESS = 5

_VALID_FORMATS = {'PDF', 'XLSX', 'CSV', 'TXT'}
_VALID_COVERAGE = {'all', 'late_only', 'selected'}


# --------------------------------------------------------------------------- #
#  Escopo                                                                      #
# --------------------------------------------------------------------------- #


def _department_id(user):
    dept_id = getattr(user, 'education_department_id', None)
    if dept_id:
        return dept_id
    school = getattr(user, 'school', None)
    return getattr(school, 'education_department_id', None) if school else None


def resolve_scope(user, report_def: ReportDef, *, school_id=None, class_group_id=None) -> ReportScope:
    role = getattr(user, 'role', None)
    if role not in SME_ROLES | SCHOOL_ROLES | {UserRole.TEACHER}:
        raise BusinessLogicError('ANALYTICS_FORBIDDEN', 'Sem acesso a relatórios.', status_code=403)

    dept_id = _department_id(user)

    # nível turma
    if class_group_id:
        allowed = set(
            get_school_classes_for_user(user=user).values_list('id', flat=True)
        )
        if str(class_group_id) not in {str(c) for c in allowed}:
            raise BusinessLogicError(
                'SCOPE_FORBIDDEN', 'Turma fora do seu escopo.', status_code=403
            )
        if 'class' not in report_def.scopes:
            raise BusinessLogicError(
                'INVALID_REPORT_PARAMS', 'Este relatório não aceita escopo de turma.'
            )
        from apps.classes.models import SchoolClass

        klass = SchoolClass.objects.select_related('school').get(id=class_group_id)
        return ReportScope(
            level='class',
            education_department_id=str(klass.school.education_department_id),
            school_id=str(klass.school_id),
            class_group_id=str(class_group_id),
            title=f'{klass.school.name} · {klass.name}',
        )

    if role == UserRole.TEACHER:
        raise BusinessLogicError(
            'INVALID_REPORT_PARAMS', 'Professor só gera relatório de turma.', status_code=400
        )

    # nível escola
    if role in SCHOOL_ROLES:
        own = getattr(user, 'school_id', None)
        if school_id and str(school_id) != str(own):
            raise BusinessLogicError(
                'SCOPE_FORBIDDEN', 'Você só pode gerar relatórios da sua escola.', status_code=403
            )
        if 'school' not in report_def.scopes:
            raise BusinessLogicError(
                'SCOPE_FORBIDDEN', 'Relatório indisponível para o escopo de escola.', status_code=403
            )
        from apps.schools.models import School

        school = School.objects.get(id=own)
        return ReportScope(
            level='school', education_department_id=str(dept_id),
            school_id=str(own), title=school.name,
        )

    # SME
    if school_id:
        from apps.schools.models import School

        school = School.objects.filter(
            id=school_id, education_department_id=dept_id
        ).first()
        if not school:
            raise BusinessLogicError('SCOPE_FORBIDDEN', 'Escola fora da sua rede.', status_code=403)
        if 'school' not in report_def.scopes:
            raise BusinessLogicError(
                'INVALID_REPORT_PARAMS', 'Este relatório não aceita escopo de escola.'
            )
        return ReportScope(
            level='school', education_department_id=str(dept_id),
            school_id=str(school_id), title=school.name,
        )

    if 'network' not in report_def.scopes:
        raise BusinessLogicError(
            'INVALID_REPORT_PARAMS', 'Este relatório exige uma escola ou turma.'
        )
    from apps.governance.models import EducationDepartment

    name = EducationDepartment.objects.filter(id=dept_id).values_list(
        'municipality_name', flat=True
    ).first()
    return ReportScope(
        level='network', education_department_id=str(dept_id),
        title=f'Rede municipal de {name}' if name else 'Rede municipal',
    )


# --------------------------------------------------------------------------- #
#  Parâmetros                                                                  #
# --------------------------------------------------------------------------- #


def validate_params(report_def: ReportDef, raw: dict) -> dict:
    params = dict(raw or {})

    fmt = str(params.get('output_format', '')).upper()
    if fmt not in report_def.formats:
        raise BusinessLogicError(
            'INVALID_REPORT_PARAMS',
            f'Formato inválido para "{report_def.name}". Aceitos: {", ".join(report_def.formats)}.',
        )
    params['output_format'] = fmt

    coverage = params.get('coverage', 'all')
    if coverage not in _VALID_COVERAGE:
        raise BusinessLogicError('INVALID_REPORT_PARAMS', 'Cobertura inválida.')
    if coverage == 'selected' and not params.get('school_ids'):
        raise BusinessLogicError(
            'INVALID_REPORT_PARAMS', 'Cobertura "selecionadas" exige school_ids.'
        )

    if params.get('include_charts') and fmt != 'PDF':
        raise BusinessLogicError(
            'INVALID_REPORT_PARAMS', 'Gráficos só no formato PDF.'
        )

    year = params.get('academic_year')
    if year not in (None, '', 'null'):
        try:
            params['academic_year'] = int(year)
        except (TypeError, ValueError):
            raise BusinessLogicError('INVALID_REPORT_PARAMS', 'Ano letivo inválido.')

    return params


# --------------------------------------------------------------------------- #
#  Ano letivo / período                                                        #
# --------------------------------------------------------------------------- #


def _resolve_year(dept_id, requested_year):
    qs = AcademicYear.objects.filter(education_department_id=dept_id)
    if requested_year:
        year = qs.filter(year=requested_year).first()
        if not year:
            raise BusinessLogicError(
                'ACADEMIC_YEAR_NOT_FOUND', f'Ano letivo {requested_year} não encontrado.', 404
            )
        return year
    return (
        qs.filter(status=AcademicYearStatus.ACTIVE).order_by('-year').first()
        or qs.order_by('-year').first()
    )


def _resolve_period(year, term):
    if year is None:
        return None
    periods = AcademicPeriod.objects.filter(academic_year=year).order_by('period_number')
    if term and str(term).isdigit():
        return periods.filter(period_number=int(term)).first()
    today = timezone.localdate()
    return (
        periods.filter(start_date__lte=today, end_date__gte=today).first()
        or periods.last()
    )


# --------------------------------------------------------------------------- #
#  Criação                                                                     #
# --------------------------------------------------------------------------- #


def create_execution(*, user, report_key: str, raw_params: dict) -> ReportExecution:
    report_def = get_report_def(report_key)
    if not report_def:
        raise BusinessLogicError('INVALID_REPORT_PARAMS', f'Relatório "{report_key}" inexistente.')
    if getattr(user, 'role', None) not in report_def.roles:
        raise BusinessLogicError(
            'SCOPE_FORBIDDEN', 'Seu perfil não tem acesso a este relatório.', status_code=403
        )

    in_progress = ReportExecution.objects.filter(
        requested_by=user,
        status__in=[ReportExecutionStatus.QUEUED, ReportExecutionStatus.PROCESSING],
    ).count()
    if in_progress >= MAX_IN_PROGRESS:
        raise BusinessLogicError(
            'REPORT_RATE_LIMITED',
            'Você já tem 5 relatórios em processamento. Aguarde a conclusão.',
            status_code=429,
        )

    params = validate_params(report_def, raw_params)
    scope = resolve_scope(
        user, report_def,
        school_id=raw_params.get('school_id'),
        class_group_id=raw_params.get('class_group_id'),
    )

    contains_pd = report_def.contains_personal_data or bool(params.get('include_student_list'))

    execution = ReportExecution.objects.create(
        report_key=report_key,
        requested_by=user,
        scope_level=scope.level,
        education_department_id=scope.education_department_id,
        school_id=scope.school_id,
        class_group_id=scope.class_group_id,
        parameters=params,
        output_format=params['output_format'],
        contains_personal_data=contains_pd,
        status=ReportExecutionStatus.QUEUED,
    )

    from apps.reports.tasks import generate_report

    generate_report.delay(str(execution.id))
    return execution


# --------------------------------------------------------------------------- #
#  Execução (chamada pela task)                                                #
# --------------------------------------------------------------------------- #


def run_execution(execution_id: str) -> None:
    from django.core.files.base import ContentFile

    execution = ReportExecution.objects.select_related(
        'requested_by', 'education_department', 'school', 'class_group'
    ).get(id=execution_id)

    execution.status = ReportExecutionStatus.PROCESSING
    execution.started_at = timezone.now()
    execution.save(update_fields=['status', 'started_at'])

    scope = ReportScope(
        level=execution.scope_level,
        education_department_id=str(execution.education_department_id or '') or None,
        school_id=str(execution.school_id or '') or None,
        class_group_id=str(execution.class_group_id or '') or None,
        title=_scope_title(execution),
    )
    year = _resolve_year(execution.education_department_id, execution.parameters.get('academic_year'))
    period = _resolve_period(year, execution.parameters.get('term'))

    from apps.reports.generators import ReportContext

    ctx = ReportContext(
        execution=execution, scope=scope, params=execution.parameters,
        academic_year=year, period=period,
    )

    try:
        result = get_generator(get_report_def(execution.report_key).generator)(ctx)
    except ReportGenerationError as exc:
        execution.status = ReportExecutionStatus.ERROR
        execution.error_code = exc.code
        execution.error_details = {'message': exc.message, 'failures': exc.failures}
        execution.finished_at = timezone.now()
        execution.save(update_fields=['status', 'error_code', 'error_details', 'finished_at'])
        return
    except Exception as exc:  # noqa: BLE001 — registra qualquer falha inesperada
        execution.status = ReportExecutionStatus.ERROR
        execution.error_code = 'INTERNAL_ERROR'
        execution.error_details = {'message': str(exc)}
        execution.finished_at = timezone.now()
        execution.save(update_fields=['status', 'error_code', 'error_details', 'finished_at'])
        raise

    execution.file.save(result.filename, ContentFile(result.content), save=False)
    execution.file_size = len(result.content)
    execution.row_count = result.row_count
    execution.status = ReportExecutionStatus.DONE
    execution.finished_at = timezone.now()
    execution.save(update_fields=[
        'file', 'file_size', 'row_count', 'status', 'finished_at',
    ])

    if execution.contains_personal_data:
        _audit(execution)


def _scope_title(execution) -> str:
    if execution.class_group_id:
        return f'{execution.school.name} · {execution.class_group.name}'
    if execution.school_id:
        return execution.school.name
    if execution.education_department_id:
        return f'Rede municipal de {execution.education_department.municipality_name}'
    return 'Rede municipal'


def _audit(execution) -> None:
    from apps.audit.models import AuditLog

    AuditLog.objects.create(
        user=execution.requested_by,
        action='REPORT_GENERATED',
        model_name='ReportExecution',
        object_id=str(execution.id),
        changes={
            'report_key': execution.report_key,
            'scope_level': execution.scope_level,
            'school_id': str(execution.school_id) if execution.school_id else None,
            'row_count': execution.row_count,
            'parameters': execution.parameters,
        },
        ip_address=execution.parameters.get('_request_ip') or '0.0.0.0',
    )

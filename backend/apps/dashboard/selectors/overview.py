"""Dashboard gerencial — visão de rede (SME) ou de unidade (direção).

Somente leitura sobre os dados existentes. Indicadores sem base de cálculo
retornam ``None`` (o frontend renderiza EmptyState / "—"), nunca ``0``.

Disponível apenas para ``sme_admin`` / ``sme_supervisor`` (rede) e
``school_director`` / ``school_secretary`` (a própria escola).
"""

from __future__ import annotations

from datetime import date

from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Q, Sum

from apps.class_diary.models import Attendance, DescriptiveEvaluation, Grade
from apps.classes.models import TeacherAllocation
from apps.classes.selectors.school_classes import get_school_classes_for_user
from apps.classes.selectors.teachers import get_teacher_profiles_for_user
from apps.governance.models import AcademicPeriod, AcademicYear, AcademicYearStatus
from apps.schools.selectors.schools import get_schools_for_user
from apps.students.models import EnrollmentStatus, TransferRequestStatus
from apps.students.selectors.enrollments import (
    get_enrollments_for_user,
    get_transfer_requests_for_user,
)
from core.models import UserRole

NETWORK_ROLES = {UserRole.SME_ADMIN, UserRole.SME_SUPERVISOR}
SCHOOL_ROLES = {UserRole.SCHOOL_DIRECTOR, UserRole.SCHOOL_SECRETARY}
DASHBOARD_ROLES = NETWORK_ROLES | SCHOOL_ROLES

_STAGE_LABEL = {
    'INFANTIL': 'Educação Infantil',
    'FUNDAMENTAL_I': 'Fundamental I',
    'FUNDAMENTAL_II': 'Fundamental II',
    'EJA': 'EJA',
}
_STAGE_ORDER = ['INFANTIL', 'FUNDAMENTAL_I', 'FUNDAMENTAL_II', 'EJA']
_SHIFTS = ['MORNING', 'AFTERNOON', 'FULL_TIME', 'NIGHT']

_TRANSFER_ORDER = [
    TransferRequestStatus.PENDING_SME,
    TransferRequestStatus.APPROVED_BY_SME,
    TransferRequestStatus.ACCEPTED_BY_DESTINATION,
    TransferRequestStatus.REJECTED,
    TransferRequestStatus.CANCELLED,
]


def _rate(part, whole):
    return round(part / whole, 4) if whole else None


def _department_id(user):
    dept_id = getattr(user, 'education_department_id', None)
    if dept_id:
        return dept_id
    school = getattr(user, 'school', None)
    return getattr(school, 'education_department_id', None) if school else None


def _current_year(dept_id):
    if not dept_id:
        return None
    qs = AcademicYear.objects.filter(education_department_id=dept_id)
    return (
        qs.filter(status=AcademicYearStatus.ACTIVE).order_by('-year').first()
        or qs.order_by('-year').first()
    )


def _current_period(year, term):
    if not year:
        return None
    periods = AcademicPeriod.objects.filter(academic_year=year).order_by('period_number')
    if term:
        return periods.filter(period_number=term).first()
    today = date.today()
    return (
        periods.filter(start_date__lte=today, end_date__gte=today).first()
        or periods.last()
    )


def _parse_term(value):
    """`term` da query string → 1..4, ou None (= todos os bimestres / ano completo)."""
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None
    return n if 1 <= n <= 4 else None


def _resolve_year(dept_id, year_param):
    """Ano letivo pedido (por número) dentro da rede; senão o ativo; senão o mais recente."""
    if not dept_id:
        return None
    qs = AcademicYear.objects.filter(education_department_id=dept_id)
    if year_param:
        try:
            picked = qs.filter(year=int(year_param)).first()
        except (TypeError, ValueError):
            picked = None
        if picked:
            return picked
    return (
        qs.filter(status=AcademicYearStatus.ACTIVE).order_by('-year').first()
        or qs.order_by('-year').first()
    )


# --------------------------------------------------------------------------- #
#  Escopo efetivo                                                              #
# --------------------------------------------------------------------------- #


def _resolve_scope(user, *, scope, school_id):
    """Retorna (level, school, can_switch, schools_qs_para_seletor)."""
    role = getattr(user, 'role', None)
    schools = get_schools_for_user(user=user).order_by('name')

    if role in NETWORK_ROLES:
        can_switch = True
        if scope == 'school' and school_id:
            picked = schools.filter(id=school_id).first()
            if picked:
                return 'school', picked, can_switch, schools
        return 'network', None, can_switch, schools

    # direção / secretaria — travado na própria escola
    return 'school', getattr(user, 'school', None), False, schools.none()


def _scoped_querysets(user, *, level, school, year, stage, shift):
    classes = get_school_classes_for_user(user=user)
    enrollments = get_enrollments_for_user(user=user, status=EnrollmentStatus.ENROLLED)
    if year:
        classes = classes.filter(academic_year=year)
        enrollments = enrollments.filter(school_class__academic_year=year)
    if level == 'school' and school is not None:
        classes = classes.filter(school=school)
        enrollments = enrollments.filter(school_class__school=school)
    if stage:
        classes = classes.filter(curriculum_matrix__education_stage__stage_type=stage)
        enrollments = enrollments.filter(
            school_class__curriculum_matrix__education_stage__stage_type=stage
        )
    if shift:
        classes = classes.filter(shift=shift)
        enrollments = enrollments.filter(school_class__shift=shift)
    return classes, enrollments


# --------------------------------------------------------------------------- #
#  Blocos do payload                                                           #
# --------------------------------------------------------------------------- #


def _kpis(user, classes, enrollments, *, level, school, year, period_ids, attendance_window):
    # materializa os ids uma vez: dá ao planner do Postgres uma cardinalidade
    # exata e evita o plano patológico do ``IN (SELECT ... joins ...)`` quando as
    # estatísticas da tabela estão frias (ex.: dentro da suíte de testes).
    enrollment_ids = list(enrollments.values_list('id', flat=True))
    active = len(enrollment_ids)
    has_enrollments = active > 0

    # frequência média por matrícula, depois média simples (definição do plano §2.5)
    attendance_avg = None
    below_minimum = None
    if has_enrollments:
        att_qs = Attendance.objects.filter(enrollment_id__in=enrollment_ids)
        if attendance_window:
            att_qs = att_qs.filter(
                date__gte=attendance_window[0], date__lte=attendance_window[1]
            )
        per_enrollment = list(
            att_qs.values('enrollment_id')
            .annotate(total=Count('id'), present=Count('id', filter=Q(status='PRESENT')))
        )
        rates = [row['present'] / row['total'] for row in per_enrollment if row['total']]
        if rates:
            attendance_avg = round(sum(rates) / len(rates) * 100, 1)
            below_minimum = sum(1 for r in rates if r < 0.75)

    diary_completeness = _diary_completeness_pct(enrollments, enrollment_ids, period_ids)

    transfers = get_transfer_requests_for_user(user=user)
    if level == 'school' and school is not None:
        pending = transfers.filter(
            destination_school=school, status=TransferRequestStatus.APPROVED_BY_SME
        ).count()
        pending_link = '/transferencias'
    else:
        pending = transfers.filter(status=TransferRequestStatus.PENDING_SME).count()
        pending_link = '/transferencias?status=PENDING_SME'

    detail = (
        f"{get_schools_for_user(user=user).count()} escolas · {classes.count()} turmas"
        if level == 'network'
        else f"{classes.count()} turmas"
    )

    return {
        'active_enrollments': {
            'value': active,
            'detail': detail,
            'link': '/matriculas?status=ENROLLED',
        },
        'average_attendance': {
            'value': attendance_avg,
            'unit': 'percent',
            'tone': _attendance_tone(attendance_avg),
            'link': '/diario/frequencia',
        },
        'below_minimum_attendance': {
            'value': below_minimum,
            'threshold': 75,
            'tone': 'danger' if below_minimum else 'neutral',
            'link': '/alunos?attendance_lt=75',
        },
        'diary_completeness': {
            'value': diary_completeness,
            'unit': 'percent',
            'tone': _completeness_tone(diary_completeness),
            'link': '#completude',
        },
        'pending_transfers': {'value': pending, 'link': pending_link},
    }


def _attendance_tone(value):
    if value is None:
        return 'neutral'
    if value < 85:
        return 'danger'
    if value < 90:
        return 'warn'
    return 'ok'


def _completeness_tone(value):
    if value is None:
        return 'neutral'
    if value < 60:
        return 'danger'
    if value < 90:
        return 'warn'
    return 'ok'


def _diary_completeness_pct(enrollments, enrollment_ids, period_ids):
    """células lançadas / esperadas nos períodos selecionados. Sem base → None."""
    if not period_ids or not enrollment_ids:
        return None
    launched = Grade.objects.filter(
        enrollment_id__in=enrollment_ids, academic_period_id__in=period_ids
    ).count()
    # células esperadas = matrícula × disciplinas da matriz × nº de bimestres selecionados
    expected = (
        enrollments.aggregate(
            n=Count('school_class__curriculum_matrix__items', distinct=False)
        )['n']
        or 0
    ) * len(period_ids)
    if not expected:
        return None
    return round(launched / expected * 100, 1)


def _trend_points(enrollments, year):
    """Um ponto de frequência por bimestre do ``year``. None se não houver base."""
    if year is None:
        return None
    # ids materializados: evita o IN (SELECT ...join...) patológico (ver _kpis)
    enrollment_ids = list(enrollments.values_list('id', flat=True))
    if not enrollment_ids:
        return None
    att = Attendance.objects.filter(enrollment_id__in=enrollment_ids)
    if not att.exists():
        return None
    periods = list(
        AcademicPeriod.objects.filter(academic_year=year).order_by('period_number')
    )
    points = []
    today = date.today()
    for p in periods:
        window = att.filter(date__gte=p.start_date, date__lte=p.end_date)
        total = window.count()
        if not total:
            points.append(
                {'term': p.period_number, 'label': p.name, 'value': None, 'partial': p.end_date >= today}
            )
            continue
        present = window.filter(status='PRESENT').count()
        points.append(
            {
                'term': p.period_number,
                'label': p.name,
                'value': round(present / total * 100, 1),
                'partial': p.end_date >= today,
            }
        )
    return points if any(pt['value'] is not None for pt in points) else None


def _attendance_trend(enrollments, year, *, prev_enrollments=None, prev_year=None, schools=None):
    points = _trend_points(enrollments, year)
    if points is None:
        return None
    series = [{'label': str(year.year), 'tone': 'brand', 'points': points}]

    prev = _trend_points(prev_enrollments, prev_year) if prev_year is not None else None
    if prev is not None:
        series.append({'label': str(prev_year.year), 'tone': 'neutral', 'points': prev})

    data = {'minimum_legal': 75, 'series': series}

    # alerta: escolas abaixo de 85% no bimestre corrente (rede)
    current = next((p for p in reversed(points) if p['value'] is not None), None)
    if current and schools is not None:
        period = AcademicPeriod.objects.filter(
            academic_year=year, period_number=current['term']
        ).first()
        if period:
            att = (
                Attendance.objects.filter(
                    enrollment_id__in=list(enrollments.values_list('id', flat=True)),
                    date__gte=period.start_date,
                    date__lte=period.end_date,
                )
                .values('enrollment__school_class__school_id')
                .annotate(total=Count('id'), present=Count('id', filter=Q(status='PRESENT')))
                .order_by()
            )
            low = [
                r for r in att
                if r['total'] and (r['present'] / r['total']) < 0.85
            ]
            if low:
                data['alert'] = {
                    'tone': 'warn',
                    'message': (
                        f"{len(low)} escola{'s' if len(low) != 1 else ''} "
                        f"abaixo de 85% de frequência no {current['label'].lower()}."
                    ),
                    'link': '/escolas',
                }
    return data


def _performance(enrollments, year, period_ids=None):
    if year is None:
        return None
    enrollment_ids = list(enrollments.values_list('id', flat=True))
    if not enrollment_ids:
        return None
    dept = year.education_department
    passing = float(getattr(dept, 'min_passing_grade', 6) or 6)
    grades = Grade.objects.filter(enrollment_id__in=enrollment_ids).select_related(
        'enrollment__school_class__curriculum_matrix__education_stage'
    )
    if period_ids:
        grades = grades.filter(academic_period_id__in=period_ids)
    if not grades.exists():
        return None
    buckets: dict[str, dict] = {}
    for g in grades:
        stage = g.enrollment.school_class.curriculum_matrix.education_stage
        st = stage.stage_type
        if st == 'INFANTIL':
            continue  # eixo qualitativo (R3)
        b = buckets.setdefault(st, {'sufficient': 0, 'recovery': 0, 'at_risk': 0, 'total': 0})
        score = float(g.final_score if g.final_score is not None else g.score)
        b['total'] += 1
        if score >= passing:
            b['sufficient'] += 1
        elif score >= passing * 0.7:
            b['recovery'] += 1
        else:
            b['at_risk'] += 1
    numeric = []
    for st in ['FUNDAMENTAL_I', 'FUNDAMENTAL_II', 'EJA']:
        b = buckets.get(st)
        if not b or not b['total']:
            continue
        numeric.append(
            {
                'stage': st,
                'label': _STAGE_LABEL[st],
                'total': b['total'],
                'sufficient_pct': round(b['sufficient'] / b['total'] * 100),
                'recovery_pct': round(b['recovery'] / b['total'] * 100),
                'at_risk_pct': round(b['at_risk'] / b['total'] * 100),
                'link': f'/alunos?stage={st}',
            }
        )

    infantil_ids = list(
        enrollments.filter(
            school_class__curriculum_matrix__education_stage__stage_type='INFANTIL'
        ).values_list('id', flat=True)
    )
    qualitative = None
    if infantil_ids:
        children = len(infantil_ids)
        delivered = DescriptiveEvaluation.objects.filter(
            enrollment_id__in=infantil_ids
        ).count()
        qualitative = {
            'label': 'Creche e Pré-escola',
            'children': children,
            'reports_delivered_pct': round(delivered / children * 100) if children else None,
            'pending': max(children - delivered, 0),
            'link': '/diario/pareceres',
        }
    if not numeric and not qualitative:
        return None
    return {'numeric_stages': numeric, 'qualitative': qualitative}


def _enrollment_by_stage(classes, enrollments):
    """turmas e matrículas por etapa × turno + ocupação."""
    rows = {
        st: {'stage': st, 'label': _STAGE_LABEL[st], 'classes': 0, 'students': 0, 'by_shift': {s: 0 for s in _SHIFTS}}
        for st in _STAGE_ORDER
    }
    for r in classes.values('curriculum_matrix__education_stage__stage_type', 'shift').annotate(n=Count('id')):
        st = r['curriculum_matrix__education_stage__stage_type']
        if st in rows:
            rows[st]['classes'] += r['n']
            if r['shift'] in rows[st]['by_shift']:
                rows[st]['by_shift'][r['shift']] += r['n']
    for r in enrollments.values('school_class__curriculum_matrix__education_stage__stage_type').annotate(n=Count('id')):
        st = r['school_class__curriculum_matrix__education_stage__stage_type']
        if st in rows:
            rows[st]['students'] = r['n']
    data = [rows[st] for st in _STAGE_ORDER if rows[st]['classes'] or rows[st]['students']]

    agg = classes.aggregate(cap=Sum('max_capacity'))
    capacity = agg['cap'] or 0
    active = enrollments.count()
    over = 0
    if active:
        enr_by_class = {
            x['school_class_id']: x['n']
            for x in enrollments.values('school_class_id').annotate(n=Count('id'))
        }
        for c in classes.values('id', 'max_capacity'):
            if enr_by_class.get(c['id'], 0) > c['max_capacity']:
                over += 1
    return {
        'rows': data,
        'students_total': active,
        'occupancy_rate': _rate(active, capacity) if active else None,
        'over_capacity_classes': over,
        'capacity': capacity,
        'link': '/turmas',
    }


def _movement(user, year, level, school):
    transfers = get_transfer_requests_for_user(user=user)
    if year:
        transfers = transfers.filter(academic_year=year)
    # .order_by() limpa o Meta.ordering de TransferRequest — sem isso o campo de
    # ordenação entra no GROUP BY e quebra a contagem por status.
    counts = {
        r['status']: r['n']
        for r in transfers.values('status').annotate(n=Count('id')).order_by()
    }
    by_status = [
        {'status': s, 'count': counts.get(s, 0)}
        for s in _TRANSFER_ORDER
    ]
    enrollments = get_enrollments_for_user(user=user)
    if year:
        enrollments = enrollments.filter(school_class__academic_year=year)
    if level == 'school' and school is not None:
        enrollments = enrollments.filter(school_class__school=school)
    dropout = enrollments.filter(status=EnrollmentStatus.DROPOUT).count()

    resolved = transfers.filter(resolved_at__isnull=False).annotate(
        span=ExpressionWrapper(F('resolved_at') - F('requested_at'), output_field=DurationField())
    )
    avg_days = None
    agg = resolved.aggregate(a=Avg('span'))['a']
    if agg is not None:
        avg_days = round(agg.total_seconds() / 86400, 1)

    total = sum(c['count'] for c in by_status) + dropout
    if total == 0:
        return None
    return {'by_status': by_status, 'dropout': dropout, 'sme_analysis_avg_days': avg_days}


def _status_for_completeness(pct, *, has_regent, is_qualitative):
    """Enum de completude do diário (statusMaps.DIARY_COMPLETENESS_STATUS)."""
    if not has_regent:
        return 'NO_TEACHER'
    if is_qualitative:
        return 'QUALITATIVE'
    if pct is None:
        return 'NO_DATA'
    if pct < 40:
        return 'CRITICAL'
    if pct >= 100:
        return 'CLOSED'
    if pct < 90:
        return 'LATE'
    return 'IN_PROGRESS'


def _attendance_pct_by(enrollment_ids, group_field):
    """{group_id: freq_%} — presença / total de registros no grupo.

    Recebe uma lista já materializada de ids de matrícula: filtrar por
    ``enrollment_id__in=[...]`` dá ao planner do Postgres uma cardinalidade
    exata e evita o plano patológico do ``IN (SELECT ... joins ...)`` quando
    as estatísticas da tabela estão frias (ex.: dentro de um teste).
    """
    if not enrollment_ids:
        return {}
    out = {}
    for r in (
        Attendance.objects.filter(enrollment_id__in=enrollment_ids)
        .values(group_field)
        .annotate(total=Count('id'), present=Count('id', filter=Q(status='PRESENT')))
    ):
        if r['total']:
            out[r[group_field]] = round(r['present'] / r['total'] * 100, 1)
    return out


def _expected_cells_by(enrollments, group_field):
    """{group_id: Σ (matrícula × itens da matriz da turma)} — células esperadas."""
    return {
        r[group_field]: r['n']
        for r in enrollments.values(group_field).annotate(
            n=Count('school_class__curriculum_matrix__items')
        )
    }


def _launched_grades_by(enrollment_ids, period_ids, group_field):
    if not period_ids or not enrollment_ids:
        return {}
    return {
        r[group_field]: r['n']
        for r in Grade.objects.filter(
            enrollment_id__in=enrollment_ids, academic_period_id__in=period_ids
        )
        .values(group_field)
        .annotate(n=Count('id'))
    }


def _diary_completeness(user, classes, enrollments, *, level, period, period_ids, schools):
    deadline = period.grade_deadline.isoformat() if period else None
    term_count = max(len(period_ids), 1)
    regent_class_ids = set(
        TeacherAllocation.objects.filter(school_class__in=classes, is_regent=True)
        .values_list('school_class_id', flat=True)
    )
    infantil_class_ids = set(
        classes.filter(
            curriculum_matrix__education_stage__stage_type='INFANTIL'
        ).values_list('id', flat=True)
    )

    # materializa uma vez — reusado pelos agregados de notas e frequência
    enrollment_ids = list(enrollments.values_list('id', flat=True))

    rows = []
    if level == 'network':
        by_school = {
            s.id: {'name': s.name, 'inep': s.inep_code or '', 'classes': 0, 'regent': 0, 'infantil': 0}
            for s in schools
        }
        for school_id, class_id in classes.values_list('school_id', 'id'):
            info = by_school.get(school_id)
            if info is None:
                continue
            info['classes'] += 1
            if class_id in regent_class_ids:
                info['regent'] += 1
            if class_id in infantil_class_ids:
                info['infantil'] += 1

        expected = _expected_cells_by(enrollments, 'school_class__school_id')
        launched = _launched_grades_by(
            enrollment_ids, period_ids, 'enrollment__school_class__school_id'
        )
        attendance = _attendance_pct_by(
            enrollment_ids, 'enrollment__school_class__school_id'
        )

        for sid, info in by_school.items():
            if not info['classes']:
                continue
            exp = expected.get(sid, 0) * term_count
            pct = round(launched.get(sid, 0) / exp * 100, 1) if exp else None
            is_qual = info['infantil'] == info['classes']
            st = _status_for_completeness(
                pct, has_regent=info['regent'] > 0, is_qualitative=is_qual
            )
            rows.append(
                {
                    'id': str(sid),
                    'name': info['name'],
                    'inep': info['inep'],
                    'classes': info['classes'],
                    'grades_launched_pct': pct,
                    'average_attendance': attendance.get(sid),
                    'status': st,
                    'link': f'/escolas/{sid}/editar',
                }
            )
        rows.sort(key=lambda x: (_completeness_rank(x['status']), x['grades_launched_pct'] or 0, x['name']))
        return {'group_by': 'school', 'deadline': deadline, 'rows': rows[:8], 'total': len(rows)}

    # nível escola → por turma
    regent_name = {
        r['school_class_id']: (
            f"{r['teacher_profile__user__first_name']} {r['teacher_profile__user__last_name']}".strip()
        )
        for r in TeacherAllocation.objects.filter(school_class__in=classes, is_regent=True)
        .select_related('teacher_profile__user')
        .values('school_class_id', 'teacher_profile__user__first_name', 'teacher_profile__user__last_name')
    }
    enr_by_class = {
        x['school_class_id']: x['n']
        for x in enrollments.values('school_class_id').annotate(n=Count('id'))
    }
    expected = _expected_cells_by(enrollments, 'school_class_id')
    launched = _launched_grades_by(enrollment_ids, period_ids, 'enrollment__school_class_id')
    attendance = _attendance_pct_by(enrollment_ids, 'enrollment__school_class_id')

    for c in classes.select_related('curriculum_matrix__education_stage').order_by('name'):
        is_qual = c.id in infantil_class_ids
        exp = expected.get(c.id, 0) * term_count
        pct = round(launched.get(c.id, 0) / exp * 100, 1) if exp else None
        st = _status_for_completeness(
            pct, has_regent=c.id in regent_class_ids, is_qualitative=is_qual
        )
        rows.append(
            {
                'id': str(c.id),
                'name': f'{c.name} · {c.shift}',
                'regent': regent_name.get(c.id) or 'Sem regente definido',
                'students': enr_by_class.get(c.id, 0),
                'grades_launched_pct': pct,
                'average_attendance': attendance.get(c.id),
                'status': st,
                'link': '/diario/lancamentos',
            }
        )
    rows.sort(key=lambda x: (_completeness_rank(x['status']), x['grades_launched_pct'] or 0, x['name']))
    return {'group_by': 'class', 'deadline': deadline, 'rows': rows[:8], 'total': len(rows)}


_COMPLETENESS_RANK = {
    'NO_TEACHER': 0,
    'CRITICAL': 1,
    'NO_DATA': 2,
    'LATE': 3,
    'IN_PROGRESS': 4,
    'QUALITATIVE': 5,
    'CLOSED': 6,
}


def _completeness_rank(status):
    return _COMPLETENESS_RANK.get(status, 9)


def _needs_you(user, classes, enrollments, *, level, school, kpis):
    items = []
    below = kpis['below_minimum_attendance']['value']
    if below:
        items.append(
            {
                'key': 'attendance',
                'tone': 'danger',
                'title': f'{below} alunos abaixo de 75% de frequência',
                'subtitle': 'Risco de reprovação por frequência.',
                'link': '/alunos',
                'action_label': 'Ver alunos',
            }
        )
    pending = kpis['pending_transfers']['value']
    if pending:
        items.append(
            {
                'key': 'transfers',
                'tone': 'warn',
                'title': (
                    f'{pending} transferências aguardando autorização da SME'
                    if level == 'network'
                    else f'{pending} transferências aguardando aceite da sua escola'
                ),
                'subtitle': 'Pendências na central de vagas.',
                'link': kpis['pending_transfers']['link'],
                'action_label': 'Analisar',
            }
        )
    without_regent = classes.exclude(
        id__in=TeacherAllocation.objects.filter(
            school_class__in=classes, is_regent=True
        ).values_list('school_class_id', flat=True)
    ).count()
    if without_regent:
        items.append(
            {
                'key': 'regent',
                'tone': 'danger',
                'title': f'{without_regent} turmas sem professor regente',
                'subtitle': 'Bloqueiam o lançamento do diário.',
                'link': '/professores/alocacoes' if level == 'network' else '/turmas',
                'action_label': 'Ver alocações',
            }
        )
    infantil_ids = list(
        enrollments.filter(
            school_class__curriculum_matrix__education_stage__stage_type='INFANTIL'
        ).values_list('id', flat=True)
    )
    if infantil_ids:
        pend = len(infantil_ids) - DescriptiveEvaluation.objects.filter(
            enrollment_id__in=infantil_ids
        ).count()
        if pend > 0:
            items.append(
                {
                    'key': 'reports',
                    'tone': 'qual',
                    'title': f'{pend} pareceres descritivos pendentes na Educação Infantil',
                    'subtitle': 'Entrega do período em aberto.',
                    'link': '/diario/pareceres',
                    'action_label': 'Ver pareceres',
                }
            )
    return items


# --------------------------------------------------------------------------- #
#  Entrada                                                                     #
# --------------------------------------------------------------------------- #


def get_dashboard_overview(
    *, user, scope=None, school_id=None, stage=None, shift=None, term=None, year=None
):
    dept_id = _department_id(user)
    academic_year = _resolve_year(dept_id, year)
    term_int = _parse_term(term)

    all_periods = (
        list(
            AcademicPeriod.objects.filter(academic_year=academic_year).order_by('period_number')
        )
        if academic_year
        else []
    )
    selected_periods = (
        [p for p in all_periods if p.period_number == term_int] if term_int else all_periods
    )
    selected_period_ids = [p.id for p in selected_periods]
    # período único (deadline/label) só quando um bimestre específico foi escolhido
    period = selected_periods[0] if term_int and selected_periods else None
    attendance_window = (
        (period.start_date, period.end_date) if period else None
    )

    level, school, can_switch, schools_qs = _resolve_scope(
        user, scope=scope, school_id=school_id
    )
    classes, enrollments = _scoped_querysets(
        user, level=level, school=school, year=academic_year, stage=stage, shift=shift
    )

    if level == 'network':
        dept = getattr(user, 'education_department', None)
        title = f'Rede municipal de {dept.municipality_name}' if dept else 'Rede municipal'
        detail = (
            f'{get_schools_for_user(user=user).count()} escolas · '
            f'{classes.count()} turmas · {enrollments.count()} matrículas ativas'
        )
    else:
        title = getattr(school, 'name', 'Unidade escolar')
        detail = (
            f'{("INEP " + school.inep_code + " · ") if getattr(school, "inep_code", None) else ""}'
            f'{classes.count()} turmas · {enrollments.count()} matrículas ativas'
        )

    kpis = _kpis(
        user, classes, enrollments, level=level, school=school, year=academic_year,
        period_ids=selected_period_ids, attendance_window=attendance_window,
    )

    prev_year = (
        AcademicYear.objects.filter(
            education_department_id=dept_id, year=academic_year.year - 1
        ).first()
        if academic_year
        else None
    )
    prev_enrollments = None
    if prev_year is not None:
        _, prev_enrollments = _scoped_querysets(
            user, level=level, school=school, year=prev_year, stage=stage, shift=shift
        )
    trend_schools = schools_qs if level == 'network' else None

    return {
        'scope': {
            'level': level,
            'title': title,
            'detail': detail,
            'can_switch_to_school': can_switch,
            'schools': [{'id': str(s.id), 'name': s.name} for s in schools_qs],
        },
        'period': {
            'academic_year': academic_year.year if academic_year else None,
            'term': term_int,
            'is_all_terms': term_int is None,
            'term_label': (
                period.name if period else ('Ano completo' if all_periods else None)
            ),
            'grade_deadline': period.grade_deadline.isoformat() if period else None,
            'days_to_deadline': (
                (period.grade_deadline - date.today()).days if period else None
            ),
            'available_years': list(
                AcademicYear.objects.filter(education_department_id=dept_id)
                .order_by('-year')
                .values_list('year', flat=True)
            ),
            'available_terms': [
                {'value': p.period_number, 'label': p.name} for p in all_periods
            ],
        },
        'filters': {'stage': stage, 'shift': shift},
        'kpis': kpis,
        'attendance_trend': _attendance_trend(
            enrollments, academic_year,
            prev_enrollments=prev_enrollments, prev_year=prev_year, schools=trend_schools,
        ),
        'performance': _performance(enrollments, academic_year, selected_period_ids),
        'enrollment_by_stage': _enrollment_by_stage(classes, enrollments),
        'movement': _movement(user, academic_year, level, school),
        'diary_completeness': _diary_completeness(
            user, classes, enrollments, level=level, period=period,
            period_ids=selected_period_ids,
            schools=schools_qs or get_schools_for_user(user=user),
        ),
        'needs_you': _needs_you(
            user, classes, enrollments, level=level, school=school, kpis=kpis
        ),
    }

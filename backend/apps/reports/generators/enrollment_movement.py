from django.db.models import Count

from apps.students.models import EnrollmentStatus, TransferRequestStatus

from .base import GeneratedFile, ReportContext, TabularSpec, build_filename, render_tabular
from ._scope import scoped_classes, scoped_enrollments, scoped_transfers

KEY = 'enrollment_movement'

_STATUS_LABEL = {
    EnrollmentStatus.ENROLLED: 'Matriculados',
    EnrollmentStatus.APPROVED: 'Aprovados',
    EnrollmentStatus.FAILED_ACADEMIC: 'Reprovados (nota)',
    EnrollmentStatus.FAILED_ATTENDANCE: 'Reprovados (frequência)',
    EnrollmentStatus.TRANSFERRED_INTERNAL: 'Transf. interna',
    EnrollmentStatus.TRANSFERRED_EXTERNAL: 'Transf. externa',
    EnrollmentStatus.DROPOUT: 'Evasão',
    EnrollmentStatus.DECEASED: 'Falecimento',
}
_TR_LABEL = {
    TransferRequestStatus.PENDING_SME: 'Transf. pendentes na SME',
    TransferRequestStatus.APPROVED_BY_SME: 'Transf. autorizadas pela SME',
    TransferRequestStatus.ACCEPTED_BY_DESTINATION: 'Transf. aceitas pelo destino',
    TransferRequestStatus.REJECTED: 'Transf. rejeitadas',
    TransferRequestStatus.CANCELLED: 'Transf. canceladas',
}


def generate(ctx: ReportContext) -> GeneratedFile:
    classes = scoped_classes(ctx.scope, ctx.academic_year)
    by_school: dict = {}
    for c in classes:
        by_school.setdefault(c.school_id, {'name': c.school.name, 'classes': 0})['classes'] += 1

    enr_counts = {
        (r['school_class__school_id'], r['status']): r['n']
        for r in scoped_enrollments(ctx.scope, ctx.academic_year, status=None)
        .values('school_class__school_id', 'status')
        .annotate(n=Count('id'))
        .order_by()
    }
    tr_counts = {
        r['origin_school_id']: r
        for r in scoped_transfers(ctx.scope, ctx.academic_year)
        .values('origin_school_id')
        .annotate(n=Count('id'))
        .order_by()
    }

    columns = ['Escola', 'Turmas'] + list(_STATUS_LABEL.values()) + ['Transferências (origem)']
    rows = []
    for sid, info in sorted(by_school.items(), key=lambda kv: kv[1]['name']):
        row = [info['name'], info['classes']]
        for status in _STATUS_LABEL:
            row.append(enr_counts.get((sid, status), 0))
        row.append(tr_counts.get(sid, {}).get('n', 0))
        rows.append(row)

    spec = TabularSpec(
        sheet_title='Movimentação',
        pdf_title='Movimentação de matrículas e transferências',
        pdf_subtitle=f'{ctx.scope.title} · ano letivo {getattr(ctx.academic_year, "year", "—")}',
        columns=columns,
        rows=rows,
    )
    return GeneratedFile(
        content=render_tabular(spec, ctx.execution.output_format),
        filename=build_filename(KEY, ctx, ctx.execution.output_format),
        row_count=len(rows),
    )

import io

from apps.students.models import EnrollmentStatus

from .base import (
    GeneratedFile,
    ReportContext,
    ReportGenerationError,
    build_filename,
)
from ._scope import descriptive_for, scoped_enrollments

KEY = 'descriptive_reports'


def generate(ctx: ReportContext) -> GeneratedFile:
    enrollments = list(
        scoped_enrollments(ctx.scope, ctx.academic_year, status=EnrollmentStatus.ENROLLED)
    )
    if not enrollments:
        raise ReportGenerationError('VALIDATION_ERROR', 'Turma sem matrículas ativas.')

    evals = {
        ev.enrollment_id: ev
        for ev in descriptive_for(enrollments, ctx.period).select_related('teacher')
    }
    klass = enrollments[0].school_class

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    title = ParagraphStyle('t', parent=styles['Title'], fontSize=15)
    name = ParagraphStyle('n', parent=styles['Heading2'], fontSize=11, spaceBefore=10)
    meta = ParagraphStyle('m', parent=styles['Normal'], fontSize=8, textColor=colors.grey)
    body = ParagraphStyle('b', parent=styles['Normal'], fontSize=9, leading=13)

    story = [
        Paragraph('Pareceres descritivos por turma', title),
        Paragraph(
            f'{klass.school.name} · {klass.name} · '
            f'{ctx.period.name if ctx.period else "ano letivo"} '
            f'{getattr(ctx.academic_year, "year", "")}',
            meta,
        ),
        Spacer(1, 0.4 * cm),
    ]
    delivered = 0
    for e in sorted(enrollments, key=lambda e: e.student.full_name):
        ev = evals.get(e.id)
        story.append(Paragraph(e.student.full_name, name))
        if ev:
            delivered += 1
            teacher = ev.teacher.get_full_name() if ev.teacher_id else '—'
            story.append(Paragraph(f'Professor(a): {teacher}', meta))
            story.append(Paragraph(ev.development_report.replace('\n', '<br/>'), body))
        else:
            story.append(Paragraph('Parecer não entregue.', meta))
    story.append(Spacer(1, 0.5 * cm))
    story.append(
        Paragraph(f'{delivered} de {len(enrollments)} pareceres entregues.', meta)
    )
    doc.build(story)

    return GeneratedFile(
        content=buf.getvalue(),
        filename=build_filename(KEY, ctx, 'PDF'),
        row_count=delivered,
    )

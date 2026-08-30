import csv
import io

from django.core.files.base import ContentFile
from django.http import FileResponse, Http404, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.class_diary.models import Grade
from apps.reports.catalog import catalog_for_role
from apps.reports.models import Report, ReportExecution
from apps.reports.selectors.reports import (
    get_department_schools,
    get_department_students,
    get_student_attendance,
    get_student_grades,
    get_students_for_school,
    resolve_report_student,
)
from apps.reports.services.executions import create_execution
from apps.reports.services.signing import make_token, read_token
from apps.reports.services.pdf_generator import (
    generate_csv_report,
    generate_excel_report,
    generate_student_card_pdf,
    generate_student_report_pdf,
)
from core.exceptions import BusinessLogicError

from .serializers import (
    CreateExecutionSerializer,
    ReportDefSerializer,
    ReportExecutionSerializer,
    ReportSerializer,
)

SME_ROLES = {'sme_admin', 'sme_supervisor'}
SCHOOL_ROLES = {'school_director', 'school_secretary'}


# --------------------------------------------------------------------------- #
#  Catálogo + execuções (PLANO_EXECUCAO_DASHBOARD §3.4)                         #
# --------------------------------------------------------------------------- #


class ReportCatalogView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user, 'role', None)
        defs = catalog_for_role(role or '')
        return Response([ReportDefSerializer.from_def(d) for d in defs])


class ReportExecutionListCreateView(ListCreateAPIView):
    serializer_class = ReportExecutionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['report_key', 'status', 'scope_level']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = ReportExecution.objects.select_related(
            'requested_by', 'education_department', 'school', 'class_group'
        )
        role = getattr(user, 'role', None)
        if role in SME_ROLES:
            return qs.filter(education_department_id=getattr(user, 'education_department_id', None))
        if role in SCHOOL_ROLES:
            return qs.filter(school_id=getattr(user, 'school_id', None))
        return qs.filter(requested_by=user)

    def create(self, request, *args, **kwargs):
        payload = CreateExecutionSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        params = dict(payload.validated_data['parameters'] or {})
        from core.middleware import AuditMiddleware  # reuse client-ip helper

        params['_request_ip'] = AuditMiddleware.get_client_ip(request)
        execution = create_execution(
            user=request.user,
            report_key=payload.validated_data['report_key'],
            raw_params=params,
        )
        return Response(
            ReportExecutionSerializer(execution, context={'request': request}).data,
            status=status.HTTP_202_ACCEPTED,
        )


class ReportExecutionDetailView(RetrieveAPIView):
    serializer_class = ReportExecutionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ReportExecutionListCreateView.get_queryset(self)


class ReportExecutionDownloadView(APIView):
    """302 para uma URL assinada e curta (§3.4/§3.6). 410 se expirou."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        qs = ReportExecutionListCreateView.get_queryset(self)
        execution = get_object_or_404(qs, pk=pk)
        if execution.status != 'DONE' or not execution.file:
            raise BusinessLogicError('VALIDATION_ERROR', 'Relatório ainda não está pronto.')
        if execution.is_expired:
            raise BusinessLogicError(
                'REPORT_EXPIRED', 'Este relatório expirou. Gere novamente.', status_code=410
            )
        token = make_token(execution.id)
        return HttpResponseRedirect(
            f'/api/v1/reports/executions/{execution.id}/file/?token={token}'
        )


class ReportExecutionFileView(APIView):
    """Entrega o arquivo apenas com token válido (5 min). Não usa MEDIA_URL público."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        if read_token(request.query_params.get('token', '')) != str(pk):
            raise Http404
        execution = get_object_or_404(ReportExecution, pk=pk)
        if not execution.file or execution.is_expired:
            raise Http404
        return FileResponse(
            execution.file.open('rb'),
            as_attachment=True,
            filename=execution.file.name.split('/')[-1],
        )


# --------------------------------------------------------------------------- #
#  Legado — arquivos avulsos + downloads síncronos do aluno                    #
# --------------------------------------------------------------------------- #


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.filter(is_active=True)
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['report_type', 'school']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'])
    def boletim_pdf(self, request):
        student = resolve_report_student(
            user=request.user, student_id=request.query_params.get('student_id')
        )
        pdf_buffer = generate_student_report_pdf(
            student, get_student_grades(student), get_student_attendance(student)
        )
        return FileResponse(
            pdf_buffer, as_attachment=True,
            filename=f'boletim_{student.unique_municipal_id}.pdf',
            content_type='application/pdf',
        )

    @action(detail=False, methods=['get'])
    def carteirinha_pdf(self, request):
        student = resolve_report_student(
            user=request.user, student_id=request.query_params.get('student_id')
        )
        return FileResponse(
            generate_student_card_pdf(student), as_attachment=True,
            filename=f'carteirinha_{student.unique_municipal_id}.pdf',
            content_type='application/pdf',
        )

    @action(detail=False, methods=['get'])
    def relatorio_excel(self, request):
        school_id = request.query_params.get('school') or request.user.school_id
        students = get_students_for_school(school_id)
        excel_buffer = generate_excel_report(students, Grade.objects.filter(enrollment__student__in=students))
        if excel_buffer:
            return FileResponse(
                excel_buffer, as_attachment=True, filename='relatorio_notas.xlsx',
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
        return Response({'error': 'Erro ao gerar Excel'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def relatorio_csv(self, request):
        school_id = request.query_params.get('school') or request.user.school_id
        students = get_students_for_school(school_id)
        csv_buffer = generate_csv_report(students, Grade.objects.filter(enrollment__student__in=students))
        return FileResponse(
            csv_buffer, as_attachment=True, filename='relatorio_notas.csv', content_type='text/csv',
        )

    @action(detail=False, methods=['get'], url_path='educacenso-export')
    def educacenso_export(self, request):
        dept_id = request.query_params.get('department') or request.user.education_department_id
        schools = get_department_schools(dept_id)
        students = get_department_students(dept_id)
        buffer = io.StringIO()
        writer = csv.writer(buffer, delimiter=';')
        writer.writerow([
            'CO_ENTIDADE', 'ID_ALUNO_MUNICIPAL', 'ID_INEP', 'NO_ALUNO', 'NU_CPF',
            'DT_NASCIMENTO', 'TP_SEXO', 'TP_COR_RACA', 'NO_MAE', 'NO_PAI', 'NU_NIS',
        ])
        school_inep = {str(s.id): s.inep_code or '' for s in schools}
        for student in students:
            enrollment = (
                student.enrollments.filter(deleted_at__isnull=True)
                .select_related('school_class__school')
                .first()
            )
            inep_school = (
                school_inep.get(str(enrollment.school_class.school_id), '') if enrollment else ''
            )
            writer.writerow([
                inep_school, student.unique_municipal_id, student.inep_id or '',
                student.full_name, student.cpf or '',
                student.birth_date.isoformat() if student.birth_date else '',
                student.gender or '', student.race_color or '', student.mother_name,
                student.father_name or '', student.nis_code or '',
            ])
        buffer.seek(0)
        return FileResponse(
            ContentFile(buffer.getvalue().encode('utf-8-sig')),
            as_attachment=True, filename='educacenso_export.csv',
            content_type='text/csv; charset=utf-8',
        )

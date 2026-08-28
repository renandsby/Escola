import csv
import io

from django.core.files.base import ContentFile
from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.reports.models import Report
from apps.reports.selectors.reports import (
    get_department_schools,
    get_department_students,
    get_student_attendance,
    get_student_by_user,
    get_student_grades,
    get_students_for_school,
)
from apps.reports.services.pdf_generator import (
    generate_csv_report,
    generate_excel_report,
    generate_student_card_pdf,
    generate_student_report_pdf,
)
from apps.class_diary.models import Grade

from .serializers import ReportSerializer


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
        """Download do boletim em PDF do aluno autenticado."""
        student = get_student_by_user(request.user)
        if not student:
            return Response({'error': 'Aluno não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        pdf_buffer = generate_student_report_pdf(
            student,
            get_student_grades(student),
            get_student_attendance(student),
        )
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=f'boletim_{student.unique_municipal_id}.pdf',
            content_type='application/pdf',
        )

    @action(detail=False, methods=['get'])
    def carteirinha_pdf(self, request):
        """Download da carteirinha em PDF do aluno autenticado."""
        student = get_student_by_user(request.user)
        if not student:
            return Response({'error': 'Aluno não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        pdf_buffer = generate_student_card_pdf(student)
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=f'carteirinha_{student.unique_municipal_id}.pdf',
            content_type='application/pdf',
        )

    @action(detail=False, methods=['get'])
    def relatorio_excel(self, request):
        """Download do relatório consolidado em Excel."""
        school_id = request.query_params.get('school') or request.user.school_id
        students = get_students_for_school(school_id)
        grades = Grade.objects.filter(enrollment__student__in=students)

        excel_buffer = generate_excel_report(students, grades)
        if excel_buffer:
            return FileResponse(
                excel_buffer,
                as_attachment=True,
                filename='relatorio_notas.xlsx',
                content_type=(
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ),
            )
        return Response({'error': 'Erro ao gerar Excel'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def relatorio_csv(self, request):
        """Download do relatório consolidado em CSV."""
        school_id = request.query_params.get('school') or request.user.school_id
        students = get_students_for_school(school_id)
        grades = Grade.objects.filter(enrollment__student__in=students)

        csv_buffer = generate_csv_report(students, grades)
        return FileResponse(
            csv_buffer,
            as_attachment=True,
            filename='relatorio_notas.csv',
            content_type='text/csv',
        )

    @action(detail=False, methods=['get'], url_path='educacenso-export')
    def educacenso_export(self, request):
        """Exportação simplificada no formato Educacenso (CSV)."""
        dept_id = request.query_params.get('department') or request.user.education_department_id
        schools = get_department_schools(dept_id)
        students = get_department_students(dept_id)

        buffer = io.StringIO()
        writer = csv.writer(buffer, delimiter=';')
        writer.writerow([
            'CO_ENTIDADE',
            'ID_ALUNO_MUNICIPAL',
            'ID_INEP',
            'NO_ALUNO',
            'NU_CPF',
            'DT_NASCIMENTO',
            'TP_SEXO',
            'TP_COR_RACA',
            'NO_MAE',
            'NO_PAI',
            'NU_NIS',
        ])
        school_inep = {str(s.id): s.inep_code or '' for s in schools}
        for student in students:
            enrollment = (
                student.enrollments.filter(deleted_at__isnull=True)
                .select_related('school_class__school')
                .first()
            )
            inep_school = ''
            if enrollment:
                inep_school = school_inep.get(str(enrollment.school_class.school_id), '')
            writer.writerow([
                inep_school,
                student.unique_municipal_id,
                student.inep_id or '',
                student.full_name,
                student.cpf or '',
                student.birth_date.isoformat() if student.birth_date else '',
                student.gender or '',
                student.race_color or '',
                student.mother_name,
                student.father_name or '',
                student.nis_code or '',
            ])

        buffer.seek(0)
        content = ContentFile(buffer.getvalue().encode('utf-8-sig'))
        return FileResponse(
            content,
            as_attachment=True,
            filename='educacenso_export.csv',
            content_type='text/csv; charset=utf-8',
        )

from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.http import FileResponse
from apps.students.models import Student
from apps.grades.models import Grade
from apps.attendance.models import Attendance
from .models import Report
from .serializers import ReportSerializer
from .pdf_generator import generate_student_report_pdf, generate_excel_report, generate_csv_report, generate_student_card_pdf


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
        """Download boletim em PDF do aluno autenticado"""
        try:
            student = Student.objects.get(user=request.user)
            grades = Grade.objects.filter(student=student)
            attendance = Attendance.objects.filter(student=student)

            pdf_buffer = generate_student_report_pdf(student, grades, attendance)

            return FileResponse(
                pdf_buffer,
                as_attachment=True,
                filename=f'boletim_{student.registration_number}.pdf',
                content_type='application/pdf'
            )
        except Student.DoesNotExist:
            return Response({'error': 'Aluno não encontrado'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def carteirinha_pdf(self, request):
        """Download carteirinha em PDF do aluno autenticado"""
        try:
            student = Student.objects.get(user=request.user)
            pdf_buffer = generate_student_card_pdf(student)

            return FileResponse(
                pdf_buffer,
                as_attachment=True,
                filename=f'carteirinha_{student.registration_number}.pdf',
                content_type='application/pdf'
            )
        except Student.DoesNotExist:
            return Response({'error': 'Aluno não encontrado'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def relatorio_excel(self, request):
        """Download relatório consolidado em Excel"""
        from apps.schools.models import School

        school_id = request.query_params.get('school', request.user.school_id)
        students = Student.objects.filter(school_id=school_id)
        grades = Grade.objects.filter(student__in=students)

        excel_buffer = generate_excel_report(students, grades)

        if excel_buffer:
            return FileResponse(
                excel_buffer,
                as_attachment=True,
                filename='relatorio_notas.xlsx',
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        return Response({'error': 'Erro ao gerar Excel'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def relatorio_csv(self, request):
        """Download relatório consolidado em CSV"""
        from apps.schools.models import School

        school_id = request.query_params.get('school', request.user.school_id)
        students = Student.objects.filter(school_id=school_id)
        grades = Grade.objects.filter(student__in=students)

        csv_buffer = generate_csv_report(students, grades)

        return FileResponse(
            csv_buffer,
            as_attachment=True,
            filename='relatorio_notas.csv',
            content_type='text/csv'
        )

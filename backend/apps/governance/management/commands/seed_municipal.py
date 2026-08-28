from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.class_diary.models import Attendance, AttendanceStatus
from apps.classes.models import Classroom, SchoolClass, Shift
from apps.curriculum.models import CurriculumMatrix, CurriculumMatrixItem, Subject
from apps.students.models import Enrollment, EnrollmentStatus
from apps.class_diary.models import Grade
from apps.schools.models import School, SchoolType
from apps.governance.models import (
    AcademicPeriod,
    AcademicYear,
    AcademicYearStatus,
    EducationDepartment,
    EducationStage,
    EvaluationType,
    StageType,
)
from apps.students.models import Student
from apps.classes.models import TeacherAllocation, TeacherProfile
from core.models import User, UserRole


class Command(BaseCommand):
    help = 'Popula a rede municipal de exemplo (SME) conforme o Design Doc'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando seed municipal...'))

        dept, _ = EducationDepartment.objects.get_or_create(
            ibge_code='3550308',
            defaults={
                'municipality_name': 'São Paulo',
                'secretary_name': 'Ana Paula Secretária',
                'min_passing_grade': Decimal('6.00'),
                'min_attendance_percentage': Decimal('75.00'),
            },
        )
        self.stdout.write(f'  SME: {dept}')

        year, _ = AcademicYear.objects.get_or_create(
            education_department=dept,
            year=2026,
            defaults={
                'status': AcademicYearStatus.ACTIVE,
                'start_date': date(2026, 2, 1),
                'end_date': date(2026, 12, 15),
            },
        )
        periods = []
        for i, name in enumerate(
            ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'],
            start=1,
        ):
            start = date(2026, 2 + (i - 1) * 2, 1)
            end = start + timedelta(days=60)
            period, _ = AcademicPeriod.objects.get_or_create(
                academic_year=year,
                period_number=i,
                defaults={
                    'name': name,
                    'start_date': start,
                    'end_date': end,
                    'grade_deadline': end + timedelta(days=7),
                },
            )
            periods.append(period)

        stage_ef, _ = EducationStage.objects.get_or_create(
            code='EF_AI',
            defaults={
                'name': 'Ensino Fundamental — Anos Iniciais',
                'stage_type': StageType.FUNDAMENTAL_I,
                'evaluation_type': EvaluationType.NUMERIC,
            },
        )
        EducationStage.objects.get_or_create(
            code='EI',
            defaults={
                'name': 'Educação Infantil (4 e 5 anos)',
                'stage_type': StageType.INFANTIL,
                'evaluation_type': EvaluationType.DESCRIPTIVE,
            },
        )

        subjects = []
        for name, area, bncc in [
            ('Português', 'Linguagens', 'LING.POR'),
            ('Matemática', 'Matemática', 'MAT'),
            ('Ciências', 'Ciências da Natureza', 'CNT.CIE'),
        ]:
            subject, _ = Subject.objects.get_or_create(
                education_department=dept,
                name=name,
                defaults={'area_of_knowledge': area, 'bncc_code': bncc},
            )
            subjects.append(subject)

        matrix, _ = CurriculumMatrix.objects.get_or_create(
            education_department=dept,
            education_stage=stage_ef,
            name='Matriz Padrão 5º Ano EF - 2026',
        )
        for subject in subjects:
            CurriculumMatrixItem.objects.get_or_create(
                curriculum_matrix=matrix,
                subject=subject,
                defaults={'weekly_hours': 5, 'annual_hours': 200},
            )

        school_a, _ = School.objects.get_or_create(
            inep_code='35000001',
            defaults={
                'education_department': dept,
                'name': 'EMEF Prof. João Silva',
                'cnpj': '12345678000100',
                'school_type': SchoolType.FUNDAMENTAL_1,
                'email': 'joao.silva@escola.sp.gov.br',
                'phone': '1130000001',
                'address_street': 'Av. Principal',
                'address_number': '100',
                'address_neighborhood': 'Centro',
                'address_city': 'São Paulo',
                'address_state': 'SP',
                'address_zip_code': '01000000',
            },
        )
        school_b, _ = School.objects.get_or_create(
            inep_code='35000002',
            defaults={
                'education_department': dept,
                'name': 'EMEF Maria Oliveira',
                'cnpj': '12345678000111',
                'school_type': SchoolType.MISTA,
                'email': 'maria.oliveira@escola.sp.gov.br',
                'phone': '1130000002',
                'address_street': 'Rua das Flores',
                'address_number': '200',
                'address_neighborhood': 'Jardins',
                'address_city': 'São Paulo',
                'address_state': 'SP',
                'address_zip_code': '01400000',
            },
        )

        def ensure_user(username, password, role, school=None, **extra):
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@escola.sp.gov.br',
                    'role': role,
                    'education_department': dept,
                    'school': school,
                    **extra,
                },
            )
            if created:
                user.set_password(password)
                user.save()
            else:
                updated = False
                if user.education_department_id != dept.id:
                    user.education_department = dept
                    updated = True
                if school and user.school_id != school.id:
                    user.school = school
                    updated = True
                if user.role != role:
                    user.role = role
                    updated = True
                if updated:
                    user.save()
            return user

        admin = ensure_user(
            'admin',
            'admin123',
            UserRole.SME_ADMIN,
            first_name='Admin',
            last_name='SME',
            is_staff=True,
            is_superuser=True,
        )
        ensure_user(
            'supervisor',
            'super123',
            UserRole.SME_SUPERVISOR,
            first_name='Supervisor',
            last_name='Pedagógico',
        )
        diretor = ensure_user(
            'diretor',
            'diretor123',
            UserRole.SCHOOL_DIRECTOR,
            school=school_a,
            first_name='Maria',
            last_name='Diretora',
        )
        school_a.director_user = diretor
        school_a.save(update_fields=['director_user'])
        ensure_user(
            'secretario',
            'sec123',
            UserRole.SCHOOL_SECRETARY,
            school=school_a,
            first_name='Carlos',
            last_name='Secretário',
        )

        profs = []
        for i in range(2):
            user = ensure_user(
                f'professor{i + 1}',
                'prof123',
                UserRole.TEACHER,
                first_name='Prof',
                last_name=f'Silva {i + 1}',
            )
            profile, _ = TeacherProfile.objects.get_or_create(
                user=user,
                defaults={
                    'education_department': dept,
                    'registration_number': f'PROF{i + 1:03d}',
                    'cpf': f'1234567890{i}',
                    'formation_area': 'Pedagogia',
                    'birth_date': date(1990, 1, 1),
                    'hiring_date': date(2020, 1, 1),
                },
            )
            profs.append(profile)

        classrooms = []
        for school in (school_a, school_b):
            for i in range(2):
                room, _ = Classroom.objects.get_or_create(
                    school=school,
                    number=f'{i + 1}',
                    defaults={
                        'capacity': 30,
                        'floor': 1,
                        'building': 'Bloco A',
                        'has_projector': True,
                        'has_whiteboard': True,
                    },
                )
                classrooms.append(room)

        turma_a, _ = SchoolClass.objects.get_or_create(
            school=school_a,
            academic_year=year,
            name='5º Ano A',
            defaults={
                'curriculum_matrix': matrix,
                'shift': Shift.MORNING,
                'max_capacity': 30,
                'room_number': '1',
                'classroom': classrooms[0],
                'inep_class_code': 'CLA0001',
            },
        )
        turma_b, _ = SchoolClass.objects.get_or_create(
            school=school_b,
            academic_year=year,
            name='5º Ano B',
            defaults={
                'curriculum_matrix': matrix,
                'shift': Shift.AFTERNOON,
                'max_capacity': 30,
                'room_number': '1',
                'classroom': classrooms[2],
                'inep_class_code': 'CLA0002',
            },
        )

        # Multi-alocação: professor1 em ambas as escolas
        for turma, subject in ((turma_a, subjects[0]), (turma_b, subjects[1])):
            TeacherAllocation.objects.get_or_create(
                teacher_profile=profs[0],
                school_class=turma,
                subject=subject,
                defaults={'is_regent': False},
            )
        TeacherAllocation.objects.get_or_create(
            teacher_profile=profs[0],
            school_class=turma_a,
            subject=None,
            defaults={'is_regent': True},
        )
        TeacherAllocation.objects.get_or_create(
            teacher_profile=profs[1],
            school_class=turma_a,
            subject=subjects[1],
            defaults={'is_regent': False},
        )

        students = []
        for i in range(5):
            user = ensure_user(
                f'aluno{i + 1}',
                'aluno123',
                UserRole.STUDENT_GUARDIAN,
                school=school_a if i < 3 else school_b,
                first_name='Aluno',
                last_name=f'Silva {i + 1}',
            )
            student, _ = Student.objects.get_or_create(
                unique_municipal_id=f'MUN{i + 1:05d}',
                defaults={
                    'education_department': dept,
                    'user': user,
                    'full_name': f'Aluno Silva {i + 1}',
                    'birth_date': date(2015, 1, 15),
                    'gender': 'M' if i % 2 == 0 else 'F',
                    'mother_name': f'Mãe Silva {i + 1}',
                    'father_name': f'Pai Silva {i + 1}',
                    'cpf': f'9876543210{i}',
                    'race_color': 'Parda',
                },
            )
            students.append(student)

        for i, student in enumerate(students):
            turma = turma_a if i < 3 else turma_b
            Enrollment.objects.get_or_create(
                student=student,
                school_class=turma,
                defaults={
                    'enrollment_number': f'ENR2026{i + 1:04d}',
                    'status': EnrollmentStatus.ENROLLED,
                },
            )

        for enrollment in Enrollment.objects.select_related('school_class'):
            for subject in subjects:
                for period in periods[:2]:
                    Grade.objects.get_or_create(
                        enrollment=enrollment,
                        subject=subject,
                        academic_period=period,
                        defaults={
                            'teacher': profs[0].user,
                            'score': Decimal('7.50'),
                            'final_score': Decimal('7.50'),
                        },
                    )
            today = timezone.localdate()
            for day in range(5):
                Attendance.objects.get_or_create(
                    enrollment=enrollment,
                    school_class=enrollment.school_class,
                    subject=subjects[0],
                    date=today - timedelta(days=day),
                    defaults={
                        'status': AttendanceStatus.PRESENT
                        if day % 3
                        else AttendanceStatus.ABSENT,
                    },
                )

        self.stdout.write(self.style.SUCCESS('Seed municipal concluído'))
        self.stdout.write(f'  Departamentos: {EducationDepartment.objects.count()}')
        self.stdout.write(f'  Escolas: {School.objects.count()}')
        self.stdout.write(f'  Usuários: {User.objects.count()}')
        self.stdout.write(f'  Alunos: {Student.objects.count()}')
        self.stdout.write(f'  Professores: {TeacherProfile.objects.count()}')
        self.stdout.write(f'  Alocações: {TeacherAllocation.objects.count()}')
        self.stdout.write(f'  Turmas: {SchoolClass.objects.count()}')
        self.stdout.write(f'  Matrículas: {Enrollment.objects.count()}')
        self.stdout.write(f'  Notas: {Grade.objects.count()}')
        self.stdout.write(f'  Frequências: {Attendance.objects.count()}')

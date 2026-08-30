from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.class_diary.models import Attendance, AttendanceStatus
from apps.classes.models import Classroom, SchoolClass, Shift
from apps.curriculum.models import CurriculumMatrix, CurriculumMatrixItem, Subject
from apps.documents.models import Document
from apps.students.models import (
    Enrollment,
    EnrollmentStatus,
    Guardian,
    KinshipType,
    Student,
    StudentGuardian,
)
from apps.class_diary.models import Grade
from apps.schools.models import School, SchoolType
from apps.governance.models import (
    CURRENT_TERM_VERSION,
    AcademicPeriod,
    AcademicYear,
    AcademicYearStatus,
    ConsentRecord,
    ConsentType,
    EducationDepartment,
    EducationStage,
    EvaluationType,
    StageType,
)
from apps.classes.models import TeacherAllocation, TeacherProfile
from apps.notifications.models import Notification
from core.models import User, UserRole


class Command(BaseCommand):
    help = (
        'Popula uma rede municipal de EXEMPLO (São Paulo) — pequena, autocontida, '
        'para uma volta rápida por todas as telas. Cobre responsáveis (portal da '
        'família), consentimentos LGPD, documentos e notificações. Para o cenário '
        'grande e realista use "seed_censo_igarassu" + "seed_dashboard_demo". '
        'Os usuários deste seed levam o sufixo ".sp" para não colidir com a rede '
        'de Igarassu (login rápido: admin.sp / responsavel.sp — senha resp123).'
    )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando seed municipal de exemplo...'))

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
            'admin.sp',
            'admin123',
            UserRole.SME_ADMIN,
            first_name='Admin',
            last_name='SME SP',
            is_staff=True,
            is_superuser=True,
        )
        ensure_user(
            'supervisor.sp',
            'super123',
            UserRole.SME_SUPERVISOR,
            first_name='Supervisor',
            last_name='Pedagógico SP',
        )
        diretor = ensure_user(
            'diretor.sp',
            'diretor123',
            UserRole.SCHOOL_DIRECTOR,
            school=school_a,
            first_name='Maria',
            last_name='Diretora',
        )
        school_a.director_user = diretor
        school_a.save(update_fields=['director_user'])
        ensure_user(
            'secretario.sp',
            'sec123',
            UserRole.SCHOOL_SECRETARY,
            school=school_a,
            first_name='Carlos',
            last_name='Secretário',
        )

        profs = []
        for i in range(2):
            user = ensure_user(
                f'professor.sp.{i + 1}',
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
                f'aluno.sp.{i + 1}',
                'aluno123',
                UserRole.STUDENT_GUARDIAN,
                school=school_a if i < 3 else school_b,
                first_name='Aluno',
                last_name=f'Silva {i + 1}',
            )
            student, _ = Student.objects.get_or_create(
                unique_municipal_id=f'SP-MUN{i + 1:05d}',
                defaults={
                    'education_department': dept,
                    'user': user,
                    'full_name': f'Aluno Silva {i + 1}',
                    'birth_date': date(2015, 1, 15),
                    'gender': 'M' if i % 2 == 0 else 'F',
                    'mother_name': f'Mãe Silva {i + 1}',
                    'father_name': f'Pai Silva {i + 1}',
                    'cpf': f'61111{i:06d}',
                    'nis_code': f'21111{i:08d}',
                    'birth_certificate': f'1111{i:05d} 01 55 2015 1 00001 001 0000000-00',
                    'race_color': ('Branca', 'Parda', 'Preta', 'Amarela', 'Parda')[i],
                },
            )
            students.append(student)

        for i, student in enumerate(students):
            turma = turma_a if i < 3 else turma_b
            Enrollment.objects.get_or_create(
                student=student,
                school_class=turma,
                defaults={
                    'enrollment_number': f'SP-ENR2026{i + 1:04d}',
                    'status': EnrollmentStatus.ENROLLED,
                },
            )

        # --- Responsáveis (portal da família) --------------------------------
        # "responsavel" acompanha os 2 primeiros alunos (irmãos); os demais têm
        # um responsável próprio.
        resp_user = ensure_user(
            'responsavel.sp', 'resp123', UserRole.STUDENT_GUARDIAN,
            first_name='Renata', last_name='Responsável',
        )
        anchor = Guardian.objects.filter(user=resp_user).first()
        if anchor is None:
            anchor = Guardian.objects.create(
                user=resp_user, full_name='Renata Responsável',
                cpf='88899000001', phone='(11) 99999-0001',
                email='responsavel.sp@escola.sp.gov.br', occupation='Comerciante',
            )
        for student in students[:2]:
            StudentGuardian.objects.get_or_create(
                student=student, guardian=anchor,
                defaults={'kinship_type': KinshipType.MOTHER, 'is_emergency_contact': True},
            )
        for i, student in enumerate(students[2:], start=3):
            guardian, _ = Guardian.objects.get_or_create(
                cpf=f'8889900000{i}',
                defaults={
                    'full_name': student.mother_name,
                    'phone': f'(11) 98888-000{i}',
                    'occupation': 'Autônoma',
                },
            )
            StudentGuardian.objects.get_or_create(
                student=student, guardian=guardian,
                defaults={'kinship_type': KinshipType.MOTHER, 'is_emergency_contact': True},
            )

        # --- Consentimentos LGPD -------------------------------------------
        for student in students:
            for ctype, granted in (
                (ConsentType.ENROLLMENT_DATA_USE, True),
                (ConsentType.IMAGE_USE, student.id.int % 4 != 0),
                (ConsentType.COMMUNICATION, True),
            ):
                ConsentRecord.objects.get_or_create(
                    student=student, consent_type=ctype,
                    defaults={'granted': granted, 'term_version': CURRENT_TERM_VERSION},
                )

        # --- Documentos anexados ------------------------------------------
        from django.conf import settings

        doc_path = 'documents/demo/modelo.pdf'
        media_file = settings.MEDIA_ROOT / doc_path
        media_file.parent.mkdir(parents=True, exist_ok=True)
        if not media_file.exists():
            media_file.write_bytes(b'%PDF-1.4\n%%EOF\n')
        for student in students[:3]:
            for dtype in ('rg', 'address_proof'):
                Document.objects.get_or_create(
                    student=student, document_type=dtype,
                    defaults={
                        'file': doc_path, 'file_name': f'{dtype}.pdf',
                        'description': 'Documento de exemplo.',
                    },
                )

        # --- Notificações in-app -----------------------------------------
        for note in (
            ('Bem-vindo ao sistema', 'A rede municipal de exemplo está pronta.', 'system', '/'),
            ('Prazo de notas', 'O bimestre corrente encerra em breve.', 'system', '/diario/lancamentos'),
        ):
            Notification.objects.get_or_create(
                user=admin, title=note[0],
                defaults={'message': note[1], 'notification_type': note[2], 'link': note[3]},
            )

        seed_enrollments = Enrollment.objects.filter(
            student__in=students
        ).select_related('school_class')
        for enrollment in seed_enrollments:
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

        d_students = Student.objects.filter(education_department=dept)
        self.stdout.write(self.style.SUCCESS(f'Seed municipal de exemplo concluído — {dept.municipality_name}'))
        self.stdout.write(f'  Escolas:        {School.objects.filter(education_department=dept).count()}')
        self.stdout.write(f'  Alunos:         {d_students.count()}')
        self.stdout.write(f'  Responsáveis:   {Guardian.objects.filter(student_links__student__in=d_students).distinct().count()}')
        self.stdout.write(f'  Turmas:         {SchoolClass.objects.filter(school__education_department=dept).count()}')
        self.stdout.write(f'  Matrículas:     {Enrollment.objects.filter(student__in=d_students).count()}')
        self.stdout.write(f'  Notas:          {Grade.objects.filter(enrollment__student__in=d_students).count()}')
        self.stdout.write(f'  Consentimentos: {ConsentRecord.objects.filter(student__in=d_students).count()}')
        self.stdout.write(f'  Documentos:     {Document.objects.filter(student__in=d_students).count()}')
        self.stdout.write('')
        self.stdout.write('  Logins: admin.sp/admin123 · diretor.sp/diretor123 · '
                          'professor.sp.1/prof123 · responsavel.sp/resp123')

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from core.models import User, UserRole
from apps.schools.models import School
from apps.students.models import Student
from apps.guardians.models import Guardian
from apps.teachers.models import Teacher
from apps.subjects.models import Subject
from apps.classes.models import Class
from apps.classrooms.models import Classroom
from apps.enrollments.models import Enrollment
from apps.grades.models import Grade
from apps.attendance.models import Attendance


class Command(BaseCommand):
    help = 'Popula banco de dados com dados de teste'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Iniciando população do banco...'))

        # 1. Criar Escolas
        self.stdout.write(self.style.SUCCESS('📚 Criando escolas...'))
        escola, created = School.objects.get_or_create(
            cnpj="12.345.678/0001-00",
            defaults={
                'name': "Escola Municipal Exemplo",
                'email': "contato@escola.com.br",
                'phone': "(11) 3000-0000",
                'website': "https://escola.com.br",
                'address': "Av. Principal, 100",
                'city': "São Paulo",
                'state': "SP",
                'zip_code': "01234-567",
                'director_name': "João Silva",
                'max_students_per_class': 40,
            }
        )
        self.stdout.write(f"  ✓ {escola.name}")

        # 2. Criar Admin
        self.stdout.write(self.style.SUCCESS('👥 Criando usuários...'))
        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                'email': "admin@escola.com.br",
                'first_name': "Admin",
                'last_name': "System",
                'role': UserRole.ADMIN,
                'school_id': str(escola.id),
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if _:
            admin.set_password("admin123")
            admin.save()
        self.stdout.write(f"  ✓ {admin} (Admin)")

        # 3. Criar Diretor
        diretor, _ = User.objects.get_or_create(
            username="diretor",
            defaults={
                'email': "diretor@escola.com.br",
                'first_name': "Maria",
                'last_name': "Silva",
                'role': UserRole.DIRECTOR,
                'school_id': str(escola.id),
            }
        )
        if _:
            diretor.set_password("diretor123")
            diretor.save()
        self.stdout.write(f"  ✓ {diretor} (Diretor)")

        # 4. Criar Professores
        self.stdout.write(self.style.SUCCESS('🎓 Criando professores...'))
        profs = []
        for i in range(2):
            user, _ = User.objects.get_or_create(
                username=f"professor{i+1}",
                defaults={
                    'email': f"prof{i+1}@escola.com.br",
                    'first_name': f"Prof",
                    'last_name': f"Silva {i+1}",
                    'role': UserRole.TEACHER,
                    'school_id': str(escola.id),
                }
            )
            if _:
                user.set_password("prof123")
                user.save()

            prof, _ = Teacher.objects.get_or_create(
                user=user,
                defaults={
                    'school_id': str(escola.id),
                    'registration_number': f"PROF{i+1:03d}",
                    'cpf': f"123.456.789-{i:02d}",
                    'birth_date': date(1990, 1, 1),
                    'academic_degree': "Licenciatura em Pedagogia",
                }
            )
            profs.append(prof)
            self.stdout.write(f"  ✓ {prof}")

        # 5. Criar Alunos
        self.stdout.write(self.style.SUCCESS('👨‍🎓 Criando alunos...'))
        students = []
        for i in range(5):
            user, _ = User.objects.get_or_create(
                username=f"aluno{i+1}",
                defaults={
                    'email': f"aluno{i+1}@escola.com.br",
                    'first_name': f"Aluno",
                    'last_name': f"Silva {i+1}",
                    'role': UserRole.STUDENT,
                    'school_id': str(escola.id),
                }
            )
            if _:
                user.set_password("aluno123")
                user.save()

            student, _ = Student.objects.get_or_create(
                user=user,
                defaults={
                    'school_id': str(escola.id),
                    'registration_number': f"MAT{i+1:05d}",
                    'birth_date': date(2010, 1, 15),
                    'gender': "M" if i % 2 == 0 else "F",
                    'cpf': f"123.456.789-{i:02d}",
                }
            )
            students.append(student)
            self.stdout.write(f"  ✓ {student}")

        # 6. Criar Salas
        self.stdout.write(self.style.SUCCESS('🚪 Criando salas...'))
        classrooms = []
        for i in range(2):
            classroom, _ = Classroom.objects.get_or_create(
                school=escola,
                number=f"sala {i+1}",
                defaults={
                    'capacity': 40,
                    'floor': 1,
                    'building': "Bloco A",
                    'has_projector': True,
                    'has_whiteboard': True,
                    'has_air_conditioning': True,
                }
            )
            classrooms.append(classroom)
            self.stdout.write(f"  ✓ {classroom}")

        # 7. Criar Disciplinas
        self.stdout.write(self.style.SUCCESS('📖 Criando disciplinas...'))
        subjects = []
        for name in ["Português", "Matemática", "Ciências"]:
            subject, _ = Subject.objects.get_or_create(
                school=escola,
                code=name[:3].upper(),
                defaults={
                    'name': name,
                    'workload': 60,
                    'minimum_passing_grade': 6.0,
                }
            )
            subjects.append(subject)
            self.stdout.write(f"  ✓ {subject}")

        # 8. Criar Turmas
        self.stdout.write(self.style.SUCCESS('👥 Criando turmas...'))
        classes_list = []
        for i in range(2):
            turma, _ = Class.objects.get_or_create(
                school=escola,
                code=f"TURMA{i+1}",
                defaults={
                    'name': f"Turma {chr(65+i)}",
                    'year': 2024,
                    'semester': 1,
                    'grade_level': "6º Ano",
                    'teacher': profs[i],
                    'classroom': classrooms[i],
                }
            )
            turma.subjects.set(subjects)
            classes_list.append(turma)
            self.stdout.write(f"  ✓ {turma}")

        # 9. Criar Matrículas
        self.stdout.write(self.style.SUCCESS('📝 Criando matrículas...'))
        for i, student in enumerate(students):
            turma = classes_list[i % len(classes_list)]
            _, created = Enrollment.objects.get_or_create(
                student=student,
                class_obj=turma,
                defaults={
                    'school_id': str(escola.id),
                    'enrollment_date': date(2024, 1, 15),
                    'status': "active",
                }
            )
            if created:
                self.stdout.write(f"  ✓ {student} em {turma}")

        # 10. Criar Notas
        self.stdout.write(self.style.SUCCESS('📊 Criando notas...'))
        for enrollment in Enrollment.objects.filter(school=escola):
            for subject in subjects:
                _, created = Grade.objects.get_or_create(
                    student=enrollment.student,
                    subject=subject,
                    class_obj=enrollment.class_obj,
                    defaults={
                        'first_period': 7.5,
                        'second_period': 8.0,
                        'third_period': 7.8,
                        'fourth_period': 8.5,
                        'participation': 8.0,
                        'behavior': 9.0,
                        'status': "pending",
                    }
                )
                if created:
                    self.stdout.write(f"  ✓ Nota de {enrollment.student} em {subject}")

        # 11. Criar Frequência
        self.stdout.write(self.style.SUCCESS('✅ Criando frequência...'))
        today = date.today()
        for i in range(5):
            attendance_date = today - timedelta(days=i)
            for enrollment in Enrollment.objects.filter(school=escola):
                for subject in subjects:
                    Attendance.objects.get_or_create(
                        student=enrollment.student,
                        class_obj=enrollment.class_obj,
                        subject=subject,
                        date=attendance_date,
                        defaults={
                            'status': "present" if i % 3 != 0 else "absent",
                        }
                    )
            self.stdout.write(f"  ✓ Frequência para {attendance_date}")

        # Resumo
        self.stdout.write(self.style.SUCCESS('\n✅ População concluída!\n'))
        self.stdout.write(f"📈 Resumo:")
        self.stdout.write(f"  • Escolas: {School.objects.count()}")
        self.stdout.write(f"  • Usuários: {User.objects.count()}")
        self.stdout.write(f"  • Alunos: {Student.objects.count()}")
        self.stdout.write(f"  • Professores: {Teacher.objects.count()}")
        self.stdout.write(f"  • Disciplinas: {Subject.objects.count()}")
        self.stdout.write(f"  • Turmas: {Class.objects.count()}")
        self.stdout.write(f"  • Matrículas: {Enrollment.objects.count()}")
        self.stdout.write(f"  • Notas: {Grade.objects.count()}")
        self.stdout.write(f"  • Frequências: {Attendance.objects.count()}")

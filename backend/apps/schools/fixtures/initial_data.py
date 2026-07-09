"""
Script para popular banco de dados com dados de teste.
Use: python manage.py shell < populate_db.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import date, datetime, timedelta
from django.utils import timezone
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
from apps.curriculum.models import Curriculum


def populate():
    """Popula o banco de dados com dados de teste."""
    print("🚀 Iniciando população do banco de dados...")

    # 1. Criar Escolas
    print("\n📚 Criando escolas...")
    escola = School.objects.create(
        name="Escola Municipal Exemplo",
        cnpj="12.345.678/0001-00",
        email="contato@escola.com.br",
        phone="(11) 3000-0000",
        website="https://escola.com.br",
        address="Av. Principal, 100",
        city="São Paulo",
        state="SP",
        zip_code="01234-567",
        director_name="João Silva",
        max_students_per_class=40,
    )
    print(f"  ✓ {escola.name}")

    # 2. Criar Admin
    print("\n👥 Criando usuários...")
    admin = User.objects.create_superuser(
        username="admin",
        email="admin@escola.com.br",
        password="admin123",
        first_name="Admin",
        last_name="System",
        role=UserRole.ADMIN,
        school=escola,
    )
    print(f"  ✓ {admin} (Admin)")

    # 3. Criar Diretor
    diretor = User.objects.create_user(
        username="diretor",
        email="diretor@escola.com.br",
        password="diretor123",
        first_name="Maria",
        last_name="Silva",
        role=UserRole.DIRECTOR,
        school=escola,
    )
    print(f"  ✓ {diretor} (Diretor)")

    # 4. Criar Professores
    print("\n🎓 Criando professores...")
    profs = []
    for i in range(2):
        user = User.objects.create_user(
            username=f"professor{i+1}",
            email=f"prof{i+1}@escola.com.br",
            password="prof123",
            first_name=f"Prof",
            last_name=f"Silva {i+1}",
            role=UserRole.TEACHER,
            school=escola,
        )
        prof = Teacher.objects.create(
            user=user,
            school=escola,
            registration_number=f"PROF{i+1:03d}",
            cpf=f"123.456.789-{i:02d}",
            birth_date=date(1990, 1, 1),
            academic_degree="Licenciatura em Pedagogia",
        )
        profs.append(prof)
        print(f"  ✓ {prof}")

    # 5. Criar Alunos
    print("\n👨‍🎓 Criando alunos...")
    students = []
    for i in range(5):
        user = User.objects.create_user(
            username=f"aluno{i+1}",
            email=f"aluno{i+1}@escola.com.br",
            password="aluno123",
            first_name=f"Aluno",
            last_name=f"Silva {i+1}",
            role=UserRole.STUDENT,
            school=escola,
        )
        student = Student.objects.create(
            user=user,
            school=escola,
            registration_number=f"MAT{i+1:05d}",
            birth_date=date(2010, 1, 15),
            gender="M" if i % 2 == 0 else "F",
            cpf=f"123.456.789-{i:02d}",
        )
        students.append(student)
        print(f"  ✓ {student}")

    # 6. Criar Responsáveis
    print("\n👨‍👩‍👧 Criando responsáveis...")
    guardians_list = []
    for i in range(3):
        user = User.objects.create_user(
            username=f"responsavel{i+1}",
            email=f"resp{i+1}@escola.com.br",
            password="resp123",
            first_name=f"Responsável",
            last_name=f"Silva {i+1}",
            role=UserRole.GUARDIAN,
            school=escola,
        )
        guardian = Guardian.objects.create(
            user=user,
            school=escola,
            relationship="mother" if i == 0 else "father",
            cpf=f"987.654.321-{i:02d}",
            occupation="Profissional",
        )
        guardian.students.set(students[i : i + 2])
        guardians_list.append(guardian)
        print(f"  ✓ {guardian}")

    # 7. Criar Salas de Aula
    print("\n🚪 Criando salas de aula...")
    classrooms = []
    for i in range(2):
        classroom = Classroom.objects.create(
            school=escola,
            number=f"sala {i+1}",
            capacity=40,
            floor=1,
            building="Bloco A",
            has_projector=True,
            has_whiteboard=True,
            has_air_conditioning=True,
        )
        classrooms.append(classroom)
        print(f"  ✓ {classroom}")

    # 8. Criar Disciplinas
    print("\n📖 Criando disciplinas...")
    subjects = []
    subject_names = ["Português", "Matemática", "Ciências"]
    for name in subject_names:
        subject = Subject.objects.create(
            school=escola,
            name=name,
            code=name[:3].upper(),
            workload=60,
            minimum_passing_grade=6.0,
        )
        subjects.append(subject)
        print(f"  ✓ {subject}")

    # 9. Criar Turmas
    print("\n👥 Criando turmas...")
    classes_list = []
    for i in range(2):
        turma = Class.objects.create(
            school=escola,
            name=f"Turma {chr(65+i)}",
            code=f"TURMA{i+1}",
            year=2024,
            semester=1,
            grade_level="6º Ano",
            teacher=profs[i],
            classroom=classrooms[i],
        )
        turma.subjects.set(subjects)
        classes_list.append(turma)
        print(f"  ✓ {turma}")

    # 10. Criar Matrículas
    print("\n📝 Criando matrículas...")
    for i, student in enumerate(students):
        turma = classes_list[i % len(classes_list)]
        enrollment = Enrollment.objects.create(
            student=student,
            class_obj=turma,
            school=escola,
            enrollment_date=date(2024, 1, 15),
            status="active",
        )
        print(f"  ✓ {student} em {turma}")

    # 11. Criar Notas
    print("\n📊 Criando notas...")
    for enrollment in Enrollment.objects.all():
        for subject in subjects:
            grade = Grade.objects.create(
                student=enrollment.student,
                subject=subject,
                class_obj=enrollment.class_obj,
                first_period=7.5,
                second_period=8.0,
                third_period=7.8,
                fourth_period=8.5,
                participation=8.0,
                behavior=9.0,
                status="pending",
            )
            print(f"  ✓ Nota de {enrollment.student} em {subject}")

    # 12. Criar Frequência
    print("\n✅ Criando frequência...")
    today = date.today()
    for i in range(5):
        attendance_date = today - timedelta(days=i)
        for enrollment in Enrollment.objects.all():
            for subject in subjects:
                Attendance.objects.create(
                    student=enrollment.student,
                    class_obj=enrollment.class_obj,
                    subject=subject,
                    date=attendance_date,
                    status="present" if i % 3 != 0 else "absent",
                )
        print(f"  ✓ Frequência para {attendance_date}")

    print("\n✅ População do banco de dados concluída!")
    print(f"\n📈 Resumo:")
    print(f"  • Escolas: {School.objects.count()}")
    print(f"  • Usuários: {User.objects.count()}")
    print(f"  • Alunos: {Student.objects.count()}")
    print(f"  • Professores: {Teacher.objects.count()}")
    print(f"  • Responsáveis: {Guardian.objects.count()}")
    print(f"  • Disciplinas: {Subject.objects.count()}")
    print(f"  • Turmas: {Class.objects.count()}")
    print(f"  • Matrículas: {Enrollment.objects.count()}")
    print(f"  • Notas: {Grade.objects.count()}")
    print(f"  • Frequências: {Attendance.objects.count()}")


if __name__ == "__main__":
    populate()

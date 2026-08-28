"""Selectors do domínio de relatórios — montam os conjuntos de dados que
alimentam a geração de PDF/Excel/CSV/Educacenso."""

from apps.class_diary.models import Attendance, Grade
from apps.schools.models import School
from apps.students.models import Student


def get_student_by_user(user):
    return Student.objects.filter(user=user, deleted_at__isnull=True).first()


def get_student_grades(student):
    return Grade.objects.filter(enrollment__student=student)


def get_student_attendance(student):
    return Attendance.objects.filter(enrollment__student=student)


def get_students_for_school(school_id):
    return (
        Student.objects.filter(
            enrollments__school_class__school_id=school_id,
            deleted_at__isnull=True,
        )
        .distinct()
    )


def get_department_schools(department_id):
    return School.objects.filter(
        education_department_id=department_id,
        deleted_at__isnull=True,
    )


def get_department_students(department_id):
    return Student.objects.filter(
        education_department_id=department_id,
        deleted_at__isnull=True,
    ).order_by('unique_municipal_id')

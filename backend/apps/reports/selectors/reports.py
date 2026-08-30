"""Selectors do domínio de relatórios — montam os conjuntos de dados que
alimentam a geração de PDF/Excel/CSV/Educacenso."""

from core.exceptions import BusinessLogicError
from apps.class_diary.models import Attendance, Grade
from apps.schools.models import School
from apps.students.models import Student
from apps.students.selectors.students import get_students_for_user


def get_student_by_user(user):
    return Student.objects.filter(user=user, deleted_at__isnull=True).first()


def resolve_report_student(*, user, student_id=None):
    """Aluno alvo de um documento (boletim/carteirinha/histórico).

    - Sem ``student_id``: o próprio aluno vinculado ao login.
    - Com ``student_id``: só se estiver no escopo RBAC do solicitante
      (gestor da rede/escola ou professor da turma).
    """
    if not student_id:
        student = get_student_by_user(user)
        if not student:
            raise BusinessLogicError(
                code='STUDENT_NOT_FOUND',
                message='Nenhum aluno vinculado a este usuário.',
                status_code=404,
            )
        return student

    student = get_students_for_user(user=user).filter(id=student_id).first()
    if not student:
        raise BusinessLogicError(
            code='SCOPE_FORBIDDEN',
            message='Você não pode emitir documentos para este aluno.',
            status_code=403,
        )
    return student


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

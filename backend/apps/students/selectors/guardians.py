from django.db.models import Avg, Count, Q

from core.models import UserRole
from core.scopes import apply_scope
from apps.students.models import Enrollment, EnrollmentStatus, Guardian, Student, StudentGuardian


def get_dependents_for_user(*, user):
    """Alunos vinculados ao usuário logado (perfil próprio + vínculos de responsável)."""
    ids: set = set()
    student_profile = getattr(user, 'student_profile', None)
    if student_profile is not None:
        ids.add(student_profile.pk)
    guardian = getattr(user, 'guardian_profile', None)
    if guardian is not None:
        ids.update(guardian.student_links.values_list('student_id', flat=True))
    return (
        Student.objects.filter(id__in=ids, deleted_at__isnull=True)
        .select_related('education_department')
        .order_by('full_name')
    )


def get_dependents_summary(*, user):
    """Resumo por dependente: turma, escola, média e frequência do ano corrente."""
    if getattr(user, 'role', None) != UserRole.STUDENT_GUARDIAN:
        return []

    from apps.class_diary.models import Attendance, Grade

    out = []
    for student in get_dependents_for_user(user=user):
        enrollment = (
            Enrollment.objects.filter(
                student=student,
                status=EnrollmentStatus.ENROLLED,
                deleted_at__isnull=True,
            )
            .select_related('school_class', 'school_class__school', 'academic_year')
            .order_by('-academic_year__year')
            .first()
        )
        enr_ids = list(
            Enrollment.objects.filter(student=student, deleted_at__isnull=True).values_list(
                'id', flat=True
            )
        )
        grade_avg = (
            Grade.objects.filter(enrollment_id__in=enr_ids).aggregate(v=Avg('score'))['v']
        )
        att = Attendance.objects.filter(enrollment_id__in=enr_ids).aggregate(
            total=Count('id'), present=Count('id', filter=Q(status='PRESENT'))
        )
        attendance_pct = (
            round(att['present'] / att['total'] * 100, 1) if att['total'] else None
        )
        out.append(
            {
                'student_id': str(student.id),
                'full_name': student.social_name or student.full_name,
                'unique_municipal_id': student.unique_municipal_id,
                'school': enrollment.school_class.school.name if enrollment else None,
                'school_class': enrollment.school_class.name if enrollment else None,
                'shift': enrollment.school_class.shift if enrollment else None,
                'academic_year': getattr(enrollment.academic_year, 'year', None)
                if enrollment
                else None,
                'grade_average': round(float(grade_avg), 1) if grade_avg is not None else None,
                'attendance_pct': attendance_pct,
                'has_active_enrollment': enrollment is not None,
            }
        )
    return out


def get_guardians_for_user(*, user, **filters):
    """Responsáveis visíveis para o usuário, conforme escopo RBAC."""
    qs = Guardian.objects.filter(deleted_at__isnull=True).select_related('user')
    qs = apply_scope(
        qs,
        user,
        department_field='student_links__student__education_department_id',
        school_field='student_links__student__enrollments__school_class__school_id',
        teacher_class_field='student_links__student__enrollments__school_class_id',
        student_field='student_links__student_id',
    )
    if filters:
        qs = qs.filter(**filters)
    return qs.distinct()


def get_student_guardian_links_for_user(*, user, **filters):
    """Vínculos aluno-responsável visíveis para o usuário, conforme escopo RBAC."""
    qs = StudentGuardian.objects.select_related('student', 'guardian')
    qs = apply_scope(
        qs,
        user,
        department_field='student__education_department_id',
        school_field='student__enrollments__school_class__school_id',
        teacher_class_field='student__enrollments__school_class_id',
        student_field='student_id',
    )
    if filters:
        qs = qs.filter(**filters)
    return qs.distinct()

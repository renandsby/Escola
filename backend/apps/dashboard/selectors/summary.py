"""Contadores do painel inicial, respeitando o escopo RBAC do usuário."""

from apps.classes.selectors.school_classes import get_school_classes_for_user
from apps.classes.selectors.teachers import get_teacher_profiles_for_user
from apps.curriculum.selectors.subjects import get_subjects_for_user
from apps.schools.selectors.schools import get_schools_for_user
from apps.students.selectors.enrollments import get_enrollments_for_user
from apps.students.selectors.students import get_students_for_user


def get_dashboard_summary(*, user):
    return {
        "students": get_students_for_user(user=user).count(),
        "enrollments": get_enrollments_for_user(user=user, status="ENROLLED").count(),
        "school_classes": get_school_classes_for_user(user=user).count(),
        "subjects": get_subjects_for_user(user=user).count(),
        "schools": get_schools_for_user(user=user).count(),
        "teachers": get_teacher_profiles_for_user(user=user).count(),
    }

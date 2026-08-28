from django.contrib import admin

from .models import Classroom, SchoolClass, TeacherAllocation, TeacherProfile


@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'school', 'academic_year', 'shift', 'is_active')
    list_filter = ('shift', 'academic_year', 'school', 'is_active')
    search_fields = ('name', 'inep_class_code')
    raw_id_fields = ('school', 'academic_year', 'curriculum_matrix', 'classroom')


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ('number', 'school', 'capacity', 'floor', 'building', 'is_active')
    list_filter = ('school', 'floor', 'is_active')
    search_fields = ('number',)
    raw_id_fields = ('school',)


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = (
        'registration_number',
        'user',
        'education_department',
        'cpf',
        'is_active',
    )
    list_filter = ('education_department', 'is_active')
    search_fields = ('registration_number', 'cpf', 'user__first_name', 'user__last_name')
    raw_id_fields = ('user', 'education_department')


@admin.register(TeacherAllocation)
class TeacherAllocationAdmin(admin.ModelAdmin):
    list_display = ('teacher_profile', 'school_class', 'subject', 'is_regent')
    list_filter = ('is_regent',)
    raw_id_fields = ('teacher_profile', 'school_class', 'subject')

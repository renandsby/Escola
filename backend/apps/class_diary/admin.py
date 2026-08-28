from django.contrib import admin

from .models import Attendance, DescriptiveEvaluation, DiaryEntry, Grade, SchoolHistory


@admin.register(DiaryEntry)
class DiaryEntryAdmin(admin.ModelAdmin):
    list_display = ('school_class', 'subject', 'teacher', 'date')
    list_filter = ('date', 'school_class', 'subject')
    search_fields = ('content', 'homework')
    raw_id_fields = ('school_class', 'subject', 'teacher')


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = (
        'enrollment',
        'subject',
        'academic_period',
        'score',
        'teacher',
    )
    list_filter = ('academic_period', 'subject', 'assessment_type')
    search_fields = (
        'enrollment__student__full_name',
        'enrollment__enrollment_number',
    )
    raw_id_fields = ('enrollment', 'subject', 'academic_period', 'teacher')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'school_class', 'date', 'status', 'subject')
    list_filter = ('status', 'date', 'school_class')
    search_fields = (
        'enrollment__student__full_name',
        'enrollment__enrollment_number',
    )
    raw_id_fields = ('enrollment', 'school_class', 'subject')


@admin.register(DescriptiveEvaluation)
class DescriptiveEvaluationAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'academic_period', 'teacher', 'updated_at')
    list_filter = ('academic_period',)
    search_fields = (
        'enrollment__student__full_name',
        'enrollment__enrollment_number',
        'development_report',
    )
    raw_id_fields = ('enrollment', 'academic_period', 'teacher')


@admin.register(SchoolHistory)
class SchoolHistoryAdmin(admin.ModelAdmin):
    list_display = ('student', 'final_status', 'overall_average', 'attendance_percentage')
    list_filter = ('final_status',)
    search_fields = ('student__full_name',)
    raw_id_fields = ('student',)

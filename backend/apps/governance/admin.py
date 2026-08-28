from django.contrib import admin

from .models import AcademicPeriod, AcademicYear, EducationDepartment, EducationStage


@admin.register(EducationDepartment)
class EducationDepartmentAdmin(admin.ModelAdmin):
    list_display = (
        'municipality_name',
        'ibge_code',
        'secretary_name',
        'min_passing_grade',
        'is_active',
    )
    search_fields = ('municipality_name', 'ibge_code')
    list_filter = ('is_active',)


class AcademicPeriodInline(admin.TabularInline):
    model = AcademicPeriod
    extra = 0


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('year', 'education_department', 'status', 'start_date', 'end_date')
    list_filter = ('status', 'education_department')
    search_fields = ('year',)
    raw_id_fields = ('education_department',)
    inlines = [AcademicPeriodInline]


@admin.register(AcademicPeriod)
class AcademicPeriodAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'academic_year',
        'period_number',
        'start_date',
        'end_date',
        'grade_deadline',
    )
    list_filter = ('academic_year',)
    raw_id_fields = ('academic_year',)


@admin.register(EducationStage)
class EducationStageAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'stage_type', 'evaluation_type', 'is_active')
    list_filter = ('stage_type', 'evaluation_type', 'is_active')
    search_fields = ('name', 'code')

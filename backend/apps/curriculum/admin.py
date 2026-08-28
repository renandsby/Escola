from django.contrib import admin

from .models import CurriculumMatrix, CurriculumMatrixItem, Subject


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'bncc_code', 'area_of_knowledge', 'education_department', 'is_active')
    list_filter = ('education_department', 'area_of_knowledge', 'is_active')
    search_fields = ('name', 'bncc_code')
    raw_id_fields = ('education_department',)


class CurriculumMatrixItemInline(admin.TabularInline):
    model = CurriculumMatrixItem
    extra = 0
    raw_id_fields = ('subject',)


@admin.register(CurriculumMatrix)
class CurriculumMatrixAdmin(admin.ModelAdmin):
    list_display = ('name', 'education_department', 'education_stage', 'is_active')
    list_filter = ('education_department', 'education_stage', 'is_active')
    search_fields = ('name',)
    raw_id_fields = ('education_department', 'education_stage')
    inlines = [CurriculumMatrixItemInline]


@admin.register(CurriculumMatrixItem)
class CurriculumMatrixItemAdmin(admin.ModelAdmin):
    list_display = ('curriculum_matrix', 'subject', 'weekly_hours', 'annual_hours')
    raw_id_fields = ('curriculum_matrix', 'subject')

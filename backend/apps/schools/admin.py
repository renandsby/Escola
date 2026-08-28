from django.contrib import admin

from .models import School


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'inep_code',
        'school_type',
        'education_department',
        'address_city',
        'is_active',
    )
    list_filter = ('school_type', 'education_department', 'is_active')
    search_fields = ('name', 'inep_code', 'cnpj')
    raw_id_fields = ('education_department', 'director_user')

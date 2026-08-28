from django.contrib import admin

from .models import Enrollment, Guardian, Student, StudentGuardian, TransferRequest


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        'full_name',
        'unique_municipal_id',
        'cpf',
        'education_department',
        'is_active',
    )
    list_filter = ('education_department', 'gender', 'has_special_needs', 'is_active')
    search_fields = ('full_name', 'unique_municipal_id', 'cpf', 'inep_id', 'mother_name')
    raw_id_fields = ('education_department', 'user')


@admin.register(Guardian)
class GuardianAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'cpf', 'phone', 'email', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('full_name', 'cpf', 'phone', 'email')
    raw_id_fields = ('user',)


@admin.register(StudentGuardian)
class StudentGuardianAdmin(admin.ModelAdmin):
    list_display = ('student', 'guardian', 'kinship_type', 'is_emergency_contact')
    list_filter = ('kinship_type', 'is_emergency_contact')
    raw_id_fields = ('student', 'guardian')


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = (
        'enrollment_number',
        'student',
        'school_class',
        'status',
        'enrollment_date',
        'is_active',
    )
    list_filter = ('status', 'is_active')
    search_fields = ('enrollment_number', 'student__full_name', 'student__unique_municipal_id')
    raw_id_fields = ('student', 'school_class', 'academic_year')


@admin.register(TransferRequest)
class TransferRequestAdmin(admin.ModelAdmin):
    list_display = (
        'student',
        'origin_school',
        'destination_school',
        'status',
        'requested_at',
    )
    list_filter = ('status', 'academic_year')
    search_fields = ('student__full_name', 'reason')
    raw_id_fields = ('student', 'origin_school', 'destination_school', 'academic_year')

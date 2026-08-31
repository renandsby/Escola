from django.contrib import admin

from apps.admissions.models import (
    AdmissionCycle,
    EnrollmentRequest,
    PriorityEvidence,
    RenewalRequest,
    SchoolPreference,
)


@admin.register(AdmissionCycle)
class AdmissionCycleAdmin(admin.ModelAdmin):
    list_display = ('name', 'target_academic_year', 'status', 'education_department')
    list_filter = ('status',)


@admin.register(RenewalRequest)
class RenewalRequestAdmin(admin.ModelAdmin):
    list_display = ('student', 'cycle', 'outcome', 'confirmed_at')
    list_filter = ('outcome',)
    raw_id_fields = ('student', 'current_enrollment', 'guardian', 'next_enrollment')


class SchoolPreferenceInline(admin.TabularInline):
    model = SchoolPreference
    extra = 0


class PriorityEvidenceInline(admin.TabularInline):
    model = PriorityEvidence
    extra = 0


@admin.register(EnrollmentRequest)
class EnrollmentRequestAdmin(admin.ModelAdmin):
    list_display = ('applicant_display', 'cycle', 'origin', 'status', 'submitted_at')
    list_filter = ('status', 'origin')
    raw_id_fields = ('guardian', 'student', 'renewal_request', 'lgpd_consent_record')
    inlines = [SchoolPreferenceInline, PriorityEvidenceInline]


@admin.register(PriorityEvidence)
class PriorityEvidenceAdmin(admin.ModelAdmin):
    list_display = ('request', 'kind', 'status', 'verified_by', 'verified_at')
    list_filter = ('status', 'kind')

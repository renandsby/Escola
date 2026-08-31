from rest_framework import serializers

from core.serializers import CPFSerializerField
from apps.admissions.models import (
    AdmissionCycle,
    EnrollmentRequest,
    PriorityEvidence,
    RenewalRequest,
    SchoolPreference,
)


# --------------------------------------------------------------------------- #
#  Ciclo                                                                       #
# --------------------------------------------------------------------------- #


class AdmissionCycleSerializer(serializers.ModelSerializer):
    target_year = serializers.IntegerField(source='target_academic_year.year', read_only=True)
    next_status = serializers.CharField(read_only=True)
    renewal_open = serializers.BooleanField(source='is_renewal_open', read_only=True)
    new_request_open = serializers.BooleanField(source='is_new_request_open', read_only=True)

    class Meta:
        model = AdmissionCycle
        fields = [
            'id',
            'education_department',
            'target_academic_year',
            'target_year',
            'name',
            'renewal_opens_at',
            'renewal_closes_at',
            'new_request_opens_at',
            'new_request_closes_at',
            'status',
            'next_status',
            'renewal_open',
            'new_request_open',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'status', 'education_department', 'created_at', 'updated_at']


class CycleCreateInputSerializer(serializers.Serializer):
    target_academic_year = serializers.UUIDField()
    name = serializers.CharField(max_length=120)
    renewal_opens_at = serializers.DateTimeField()
    renewal_closes_at = serializers.DateTimeField()
    new_request_opens_at = serializers.DateTimeField()
    new_request_closes_at = serializers.DateTimeField()


# --------------------------------------------------------------------------- #
#  Rematrícula                                                                 #
# --------------------------------------------------------------------------- #


class RenewalRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    target_year = serializers.IntegerField(source='cycle.target_academic_year.year', read_only=True)
    current_school = serializers.CharField(
        source='current_enrollment.school_class.school.name', read_only=True
    )
    current_class = serializers.CharField(
        source='current_enrollment.school_class.name', read_only=True
    )
    renewal_open = serializers.BooleanField(source='cycle.is_renewal_open', read_only=True)
    next_enrollment_id = serializers.UUIDField(read_only=True)
    transfer_request_id = serializers.SerializerMethodField()

    def get_transfer_request_id(self, obj):
        tr = getattr(obj, 'transfer_request', None)
        return str(tr.id) if tr is not None else None

    class Meta:
        model = RenewalRequest
        fields = [
            'id',
            'cycle',
            'student',
            'student_name',
            'target_year',
            'current_school',
            'current_class',
            'outcome',
            'contact_phone',
            'residential_address',
            'residential_lat',
            'residential_lng',
            'has_new_special_needs',
            'special_needs_note',
            'confirmed_at',
            'renewal_open',
            'next_enrollment_id',
            'transfer_request_id',
            'created_at',
        ]
        read_only_fields = fields


class RenewalSubmitInputSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(choices=['STAY', 'INTERNAL_TRANSFER', 'NOT_RETURNING'])
    contact_phone = serializers.CharField(required=False, allow_blank=True, default='')
    residential_address = serializers.CharField(required=False, allow_blank=True, default='')
    residential_lat = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    residential_lng = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    has_new_special_needs = serializers.BooleanField(required=False, default=False)
    special_needs_note = serializers.CharField(required=False, allow_blank=True, default='')


class RenewalMaterializeInputSerializer(serializers.Serializer):
    school_class = serializers.UUIDField()


# --------------------------------------------------------------------------- #
#  Solicitação de matrícula                                                    #
# --------------------------------------------------------------------------- #


class SchoolPreferenceSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)

    class Meta:
        model = SchoolPreference
        fields = ['id', 'rank', 'school', 'school_name']
        read_only_fields = fields


class PriorityEvidenceSerializer(serializers.ModelSerializer):
    request_applicant = serializers.CharField(source='request.applicant_display', read_only=True)

    class Meta:
        model = PriorityEvidence
        fields = [
            'id',
            'request',
            'request_applicant',
            'kind',
            'declared_school',
            'file',
            'file_name',
            'status',
            'verified_by',
            'verified_at',
            'review_note',
            'created_at',
        ]
        read_only_fields = fields


class EnrollmentRequestSerializer(serializers.ModelSerializer):
    applicant_display = serializers.CharField(read_only=True)
    target_year = serializers.IntegerField(source='cycle.target_academic_year.year', read_only=True)
    preferences = SchoolPreferenceSerializer(many=True, read_only=True)
    evidences = PriorityEvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = EnrollmentRequest
        fields = [
            'id',
            'cycle',
            'target_year',
            'guardian',
            'origin',
            'renewal_request',
            'student',
            'applicant_display',
            'applicant_name',
            'applicant_cpf',
            'applicant_birth_date',
            'applicant_mother_name',
            'desired_shift',
            'target_grade_label',
            'residential_address',
            'residential_lat',
            'residential_lng',
            'status',
            'submitted_at',
            'score_total',
            'score_breakdown',
            'preferences',
            'evidences',
            'created_at',
        ]
        read_only_fields = [
            'id', 'guardian', 'origin', 'renewal_request', 'status', 'submitted_at',
            'score_total', 'score_breakdown', 'preferences', 'evidences', 'created_at',
        ]


class RequestCreateInputSerializer(serializers.Serializer):
    cycle = serializers.UUIDField()
    desired_shift = serializers.CharField(max_length=20)
    target_grade_label = serializers.CharField(max_length=80)
    residential_address = serializers.CharField(max_length=255)
    residential_lat = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    residential_lng = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    student = serializers.UUIDField(required=False, allow_null=True)
    applicant_name = serializers.CharField(required=False, allow_blank=True, default='')
    applicant_cpf = CPFSerializerField(required=False, allow_blank=True, default='')
    applicant_birth_date = serializers.DateField(required=False, allow_null=True)
    applicant_mother_name = serializers.CharField(required=False, allow_blank=True, default='')


class PreferencesInputSerializer(serializers.Serializer):
    schools = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=3)


class EvidenceInputSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=['PCD', 'SIBLING', 'SOCIAL_VULNERABILITY'])
    file = serializers.FileField()
    declared_school = serializers.UUIDField(required=False, allow_null=True)


class SubmitInputSerializer(serializers.Serializer):
    lgpd_consent = serializers.BooleanField()


class EvidenceVerifyInputSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['VERIFIED', 'REJECTED'])
    note = serializers.CharField(required=False, allow_blank=True, default='')

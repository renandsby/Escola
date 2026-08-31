from rest_framework import serializers

from core.serializers import CPFSerializerField
from apps.students.models import Enrollment, Guardian, Student, StudentGuardian, TransferRequest


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------


class StudentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    age = serializers.SerializerMethodField()
    registration_number = serializers.CharField(read_only=True)
    cpf = CPFSerializerField(required=True)

    def validate_cpf(self, value):
        qs = Student.objects.filter(cpf=value, deleted_at__isnull=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('CPF já cadastrado para outro aluno.')
        return value

    class Meta:
        model = Student
        fields = [
            'id',
            'education_department',
            'user',
            'user_name',
            'user_email',
            'unique_municipal_id',
            'registration_number',
            'inep_id',
            'full_name',
            'social_name',
            'cpf',
            'birth_certificate',
            'nis_code',
            'birth_date',
            'gender',
            'race_color',
            'mother_name',
            'father_name',
            'has_special_needs',
            'special_needs_details',
            'notes',
            'age',
            'is_active',
            'created_at',
            'updated_at',
            'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at', 'registration_number']

    def get_age(self, obj):
        return obj.get_age()


class StudentListSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id',
            'unique_municipal_id',
            'full_name',
            'social_name',
            'cpf',
            'birth_date',
            'mother_name',
            'has_special_needs',
            'age',
            'is_active',
        ]

    def get_age(self, obj):
        return obj.get_age()


# ---------------------------------------------------------------------------
# Guardian
# ---------------------------------------------------------------------------


class GuardianSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    students_count = serializers.SerializerMethodField()
    cpf = CPFSerializerField(required=True)

    def validate_cpf(self, value):
        qs = Guardian.objects.filter(cpf=value, deleted_at__isnull=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('CPF já cadastrado para outro responsável.')
        return value

    class Meta:
        model = Guardian
        fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'full_name',
            'cpf',
            'phone',
            'email',
            'address',
            'occupation',
            'students_count',
            'is_active',
            'created_at',
            'updated_at',
            'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at']

    def get_students_count(self, obj):
        return obj.student_links.count()


class GuardianListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guardian
        fields = ['id', 'full_name', 'cpf', 'phone', 'email', 'is_active']


class StudentGuardianSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    guardian_name = serializers.CharField(source='guardian.full_name', read_only=True)

    class Meta:
        model = StudentGuardian
        fields = [
            'id',
            'student',
            'student_name',
            'guardian',
            'guardian_name',
            'kinship_type',
            'is_emergency_contact',
        ]


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    school_class_name = serializers.CharField(source='school_class.name', read_only=True)
    school = serializers.UUIDField(source='school_class.school_id', read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id',
            'student',
            'student_name',
            'school_class',
            'school_class_name',
            'school',
            'academic_year',
            'enrollment_number',
            'enrollment_date',
            'status',
            'is_active',
            'created_at',
            'updated_at',
            'deleted_at',
        ]
        read_only_fields = [
            'id',
            'academic_year',
            'enrollment_date',
            'created_at',
            'updated_at',
            'deleted_at',
        ]


class EnrollmentListSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    school_class_name = serializers.CharField(source='school_class.name', read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id',
            'enrollment_number',
            'student',
            'student_name',
            'school_class',
            'school_class_name',
            'status',
            'is_active',
        ]


class EnrollmentCreateInputSerializer(serializers.Serializer):
    """Input serializer para criação de matrícula via camada de serviço."""

    student = serializers.UUIDField(required=True)
    school_class = serializers.UUIDField(required=True)
    enrollment_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)


# ---------------------------------------------------------------------------
# Transfer Request
# ---------------------------------------------------------------------------


class TransferRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    origin_school_name = serializers.CharField(source='origin_school.name', read_only=True)
    destination_school_name = serializers.CharField(
        source='destination_school.name',
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = TransferRequest
        fields = [
            'id',
            'student',
            'student_name',
            'origin_school',
            'origin_school_name',
            'destination_school',
            'destination_school_name',
            'academic_year',
            'reason',
            'status',
            'target_enrollment',
            'requested_at',
            'resolved_at',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'target_enrollment',
            'requested_at',
            'resolved_at',
            'created_at',
            'updated_at',
        ]


class TransferRequestListSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)

    class Meta:
        model = TransferRequest
        fields = [
            'id',
            'student',
            'student_name',
            'origin_school',
            'destination_school',
            'status',
            'requested_at',
        ]

from rest_framework import serializers

from core.models import UserRole
from apps.classes.models import Classroom, SchoolClass, TeacherAllocation, TeacherProfile

_SCHOOL_ROLES = {UserRole.SCHOOL_DIRECTOR, UserRole.SCHOOL_SECRETARY}


class SchoolScopedWriteMixin:
    """Impede que direção/secretaria crie ou mova registros para outra escola."""

    def _validate_school_scope(self, school):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and getattr(user, 'role', None) in _SCHOOL_ROLES:
            if school is not None and school.id != getattr(user, 'school_id', None):
                raise serializers.ValidationError(
                    {'school': 'Você só pode gerenciar registros da sua própria escola.'}
                )


# ---------------------------------------------------------------------------
# SchoolClass
# ---------------------------------------------------------------------------


class SchoolClassSerializer(SchoolScopedWriteMixin, serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    academic_year_label = serializers.CharField(source='academic_year.year', read_only=True)
    curriculum_matrix_name = serializers.CharField(source='curriculum_matrix.name', read_only=True)
    classroom_number = serializers.CharField(source='classroom.number', read_only=True, allow_null=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = SchoolClass
        fields = [
            'id',
            'school',
            'school_name',
            'academic_year',
            'academic_year_label',
            'curriculum_matrix',
            'curriculum_matrix_name',
            'name',
            'shift',
            'max_capacity',
            'room_number',
            'inep_class_code',
            'classroom',
            'classroom_number',
            'student_count',
            'is_active',
            'created_at',
            'updated_at',
            'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at']

    def get_student_count(self, obj):
        return obj.get_student_count()

    def validate_max_capacity(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('A capacidade deve ser um número positivo.')
        return value

    def validate(self, data):
        school = data.get('school') or getattr(self.instance, 'school', None)
        self._validate_school_scope(school)
        return data


class SchoolClassListSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = SchoolClass
        fields = [
            'id',
            'name',
            'school',
            'school_name',
            'shift',
            'academic_year',
            'student_count',
            'is_active',
        ]

    def get_student_count(self, obj):
        return obj.get_student_count()


ClassSerializer = SchoolClassSerializer
ClassListSerializer = SchoolClassListSerializer


# ---------------------------------------------------------------------------
# Classroom
# ---------------------------------------------------------------------------


class ClassroomSerializer(SchoolScopedWriteMixin, serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)

    class Meta:
        model = Classroom
        fields = [
            'id', 'school', 'school_name', 'number', 'capacity', 'floor', 'building',
            'has_projector', 'has_whiteboard', 'has_blackboard',
            'has_air_conditioning', 'has_wifi',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'school_name', 'created_at', 'updated_at']

    def validate_capacity(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('A capacidade deve ser um número positivo.')
        return value

    def validate(self, data):
        school = data.get('school') or getattr(self.instance, 'school', None)
        self._validate_school_scope(school)
        return data


# ---------------------------------------------------------------------------
# Teachers
# ---------------------------------------------------------------------------


class TeacherProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = TeacherProfile
        fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'education_department',
            'registration_number',
            'cpf',
            'formation_area',
            'birth_date',
            'hiring_date',
            'is_active',
            'created_at',
            'updated_at',
            'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at']


class TeacherProfileListSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = TeacherProfile
        fields = [
            'id',
            'registration_number',
            'user_name',
            'formation_area',
            'is_active',
        ]


class TeacherAllocationSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(
        source='teacher_profile.user.get_full_name',
        read_only=True,
    )
    school_class_name = serializers.CharField(source='school_class.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True, allow_null=True)

    class Meta:
        model = TeacherAllocation
        fields = [
            'id',
            'teacher_profile',
            'teacher_name',
            'school_class',
            'school_class_name',
            'subject',
            'subject_name',
            'is_regent',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class TeacherAllocationCreateInputSerializer(serializers.Serializer):
    teacher_profile = serializers.UUIDField()
    school_class = serializers.UUIDField()
    subject = serializers.UUIDField(required=False, allow_null=True)
    is_regent = serializers.BooleanField(required=False, default=False)


TeacherSerializer = TeacherProfileSerializer
TeacherListSerializer = TeacherProfileListSerializer

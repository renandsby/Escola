from rest_framework import serializers

from apps.class_diary.models import Attendance, DescriptiveEvaluation, DiaryEntry, Grade, SchoolHistory


# ---------------------------------------------------------------------------
# Diary
# ---------------------------------------------------------------------------


class DiaryEntrySerializer(serializers.ModelSerializer):
    school_class_name = serializers.CharField(source='school_class.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True)

    class Meta:
        model = DiaryEntry
        fields = [
            'id',
            'school_class',
            'school_class_name',
            'subject',
            'subject_name',
            'teacher',
            'teacher_name',
            'date',
            'content',
            'homework',
            'observations',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'date', 'created_at', 'updated_at']


# ---------------------------------------------------------------------------
# Grade
# ---------------------------------------------------------------------------


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='enrollment.student.full_name',
        read_only=True,
    )
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    academic_period_name = serializers.CharField(source='academic_period.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    effective_score = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = [
            'id',
            'enrollment',
            'student_name',
            'subject',
            'subject_name',
            'academic_period',
            'academic_period_name',
            'teacher',
            'teacher_name',
            'score',
            'recovery_score',
            'final_score',
            'effective_score',
            'assessment_type',
            'notes',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_effective_score(self, obj):
        return obj.get_effective_score()


class GradeListSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='enrollment.student.full_name',
        read_only=True,
    )
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    effective_score = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = [
            'id',
            'enrollment',
            'student_name',
            'subject',
            'subject_name',
            'academic_period',
            'score',
            'effective_score',
        ]

    def get_effective_score(self, obj):
        return obj.get_effective_score()


class GradeBatchUpsertItemSerializer(serializers.Serializer):
    enrollment = serializers.UUIDField()
    subject = serializers.UUIDField()
    academic_period = serializers.UUIDField()
    teacher = serializers.UUIDField(required=False)
    score = serializers.DecimalField(max_digits=5, decimal_places=2)
    recovery_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    final_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    assessment_type = serializers.CharField(required=False, default='PERIOD_EXAM')
    notes = serializers.CharField(required=False, allow_blank=True, default='')


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='enrollment.student.full_name',
        read_only=True,
    )
    school_class_name = serializers.CharField(source='school_class.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True, allow_null=True)
    observation = serializers.CharField(source='justification_note', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id',
            'enrollment',
            'student_name',
            'school_class',
            'school_class_name',
            'subject',
            'subject_name',
            'date',
            'status',
            'justification_note',
            'observation',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AttendanceListSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='enrollment.student.full_name',
        read_only=True,
    )

    class Meta:
        model = Attendance
        fields = [
            'id',
            'enrollment',
            'student_name',
            'school_class',
            'subject',
            'date',
            'status',
        ]


class AttendanceBatchUpsertItemSerializer(serializers.Serializer):
    enrollment = serializers.UUIDField()
    school_class = serializers.UUIDField()
    subject = serializers.UUIDField(required=False, allow_null=True)
    date = serializers.DateField()
    status = serializers.CharField()
    justification_note = serializers.CharField(required=False, allow_blank=True, default='')


# ---------------------------------------------------------------------------
# Descriptive Evaluation
# ---------------------------------------------------------------------------


class DescriptiveEvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='enrollment.student.full_name',
        read_only=True,
    )
    academic_period_name = serializers.CharField(source='academic_period.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)

    class Meta:
        model = DescriptiveEvaluation
        fields = [
            'id',
            'enrollment',
            'student_name',
            'academic_period',
            'academic_period_name',
            'teacher',
            'teacher_name',
            'development_report',
            'learning_milestones',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DescriptiveEvaluationListSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='enrollment.student.full_name',
        read_only=True,
    )
    academic_period_name = serializers.CharField(source='academic_period.name', read_only=True)

    class Meta:
        model = DescriptiveEvaluation
        fields = [
            'id',
            'enrollment',
            'student_name',
            'academic_period',
            'academic_period_name',
            'teacher',
        ]


# ---------------------------------------------------------------------------
# School History
# ---------------------------------------------------------------------------


class SchoolHistorySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)

    class Meta:
        model = SchoolHistory
        fields = [
            'id', 'student', 'student_name', 'total_classes',
            'absences', 'attendance_percentage', 'overall_average',
            'final_status', 'last_updated', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_updated', 'created_at', 'updated_at']

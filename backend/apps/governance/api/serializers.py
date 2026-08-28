from rest_framework import serializers

from apps.governance.models import (
    AcademicPeriod,
    AcademicYear,
    EducationDepartment,
    EducationStage,
)


class EducationDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationDepartment
        fields = [
            'id',
            'municipality_name',
            'ibge_code',
            'secretary_name',
            'min_passing_grade',
            'min_attendance_percentage',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EducationDepartmentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationDepartment
        fields = [
            'id',
            'municipality_name',
            'ibge_code',
            'is_active',
        ]


class AcademicYearSerializer(serializers.ModelSerializer):
    education_department_name = serializers.CharField(
        source='education_department.municipality_name',
        read_only=True,
    )

    class Meta:
        model = AcademicYear
        fields = [
            'id',
            'education_department',
            'education_department_name',
            'year',
            'status',
            'start_date',
            'end_date',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AcademicYearListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'year', 'status', 'education_department', 'is_active']


class AcademicPeriodSerializer(serializers.ModelSerializer):
    academic_year_label = serializers.IntegerField(source='academic_year.year', read_only=True)

    class Meta:
        model = AcademicPeriod
        fields = [
            'id',
            'academic_year',
            'academic_year_label',
            'name',
            'period_number',
            'start_date',
            'end_date',
            'grade_deadline',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AcademicPeriodListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicPeriod
        fields = [
            'id',
            'name',
            'period_number',
            'academic_year',
            'start_date',
            'end_date',
        ]


class EducationStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationStage
        fields = [
            'id',
            'name',
            'code',
            'stage_type',
            'evaluation_type',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

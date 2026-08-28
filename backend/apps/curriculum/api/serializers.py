from rest_framework import serializers

from apps.curriculum.models import CurriculumMatrix, CurriculumMatrixItem, Subject


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = [
            'id',
            'education_department',
            'name',
            'bncc_code',
            'area_of_knowledge',
            'description',
            'minimum_passing_grade',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubjectListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = [
            'id',
            'name',
            'bncc_code',
            'area_of_knowledge',
            'is_active',
        ]


class CurriculumMatrixItemSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = CurriculumMatrixItem
        fields = [
            'id',
            'curriculum_matrix',
            'subject',
            'subject_name',
            'weekly_hours',
            'annual_hours',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CurriculumMatrixSerializer(serializers.ModelSerializer):
    education_stage_name = serializers.CharField(source='education_stage.name', read_only=True)
    items = CurriculumMatrixItemSerializer(many=True, read_only=True)

    class Meta:
        model = CurriculumMatrix
        fields = [
            'id',
            'education_department',
            'education_stage',
            'education_stage_name',
            'name',
            'items',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CurriculumMatrixListSerializer(serializers.ModelSerializer):
    education_stage_name = serializers.CharField(source='education_stage.name', read_only=True)

    class Meta:
        model = CurriculumMatrix
        fields = [
            'id',
            'name',
            'education_department',
            'education_stage',
            'education_stage_name',
            'is_active',
        ]

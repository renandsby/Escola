from rest_framework import serializers

from apps.schools.models import School


class SchoolSerializer(serializers.ModelSerializer):
    director_name = serializers.CharField(
        source='director_user.get_full_name',
        read_only=True,
    )
    education_department_name = serializers.CharField(
        source='education_department.municipality_name',
        read_only=True,
    )

    class Meta:
        model = School
        fields = [
            'id',
            'education_department',
            'education_department_name',
            'inep_code',
            'name',
            'cnpj',
            'school_type',
            'director_user',
            'director_name',
            'email',
            'phone',
            'website',
            'address_street',
            'address_number',
            'address_neighborhood',
            'address_city',
            'address_state',
            'address_zip_code',
            'max_students_per_class',
            'is_active',
            'created_at',
            'updated_at',
            'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'deleted_at']


class SchoolListSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = [
            'id',
            'name',
            'inep_code',
            'school_type',
            'address_city',
            'email',
            'is_active',
        ]

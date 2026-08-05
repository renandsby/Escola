from rest_framework import serializers
from .models import School


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = [
            'id', 'name', 'cnpj', 'email', 'phone', 'website',
            'address', 'city', 'state', 'zip_code',
            'director_name', 'max_students_per_class',
            'school_year_start', 'school_year_end',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SchoolListSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ['id', 'name', 'cnpj', 'city', 'email', 'is_active']

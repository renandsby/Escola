import django_filters

from .models import Student


class StudentFilterSet(django_filters.FilterSet):
    cpf = django_filters.CharFilter(field_name='cpf', lookup_expr='exact')
    unique_municipal_id = django_filters.CharFilter(field_name='unique_municipal_id', lookup_expr='exact')
    inep_id = django_filters.CharFilter(field_name='inep_id', lookup_expr='exact')
    mother_name = django_filters.CharFilter(field_name='mother_name', lookup_expr='icontains')

    class Meta:
        model = Student
        fields = [
            'education_department',
            'gender',
            'has_special_needs',
            'is_active',
            'cpf',
            'unique_municipal_id',
            'inep_id',
            'mother_name',
        ]

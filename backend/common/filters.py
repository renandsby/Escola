from django_filters import rest_framework as filters
from django.db import models


class CustomFilterSet(filters.FilterSet):
    """FilterSet base customizado."""

    class Meta:
        abstract = True


class DateRangeFilter(filters.DateFromToRangeFilter):
    """Filtro customizado para range de datas."""

    field_name = 'created_at'

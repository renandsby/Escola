from rest_framework import filters, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from core.permissions import CanManageSchools

from apps.schools.models import School
from apps.schools.selectors.schools import get_schools_for_user

from .serializers import SchoolListSerializer, SchoolSerializer


class SchoolViewSet(viewsets.ModelViewSet):
    queryset = School.objects.filter(deleted_at__isnull=True)
    serializer_class = SchoolSerializer
    permission_classes = [IsAuthenticated, CanManageSchools]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'is_active',
        'school_type',
        'education_department',
        'address_state',
        'address_city',
    ]
    search_fields = ['name', 'cnpj', 'inep_code', 'email']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return get_schools_for_user(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return SchoolListSerializer
        return SchoolSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().destroy(request, *args, **kwargs)

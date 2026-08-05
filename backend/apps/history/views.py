from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import SchoolHistory
from .serializers import SchoolHistorySerializer


class SchoolHistoryViewSet(viewsets.ModelViewSet):
    queryset = SchoolHistory.objects.filter(is_active=True)
    serializer_class = SchoolHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['final_status']
    search_fields = ['student__user__first_name', 'student__user__last_name']
    ordering_fields = ['overall_average', 'attendance_percentage']
    ordering = ['-overall_average']

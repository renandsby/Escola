from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import StudentCard
from .serializers import StudentCardSerializer


class StudentCardViewSet(viewsets.ModelViewSet):
    queryset = StudentCard.objects.filter(is_active=True)
    serializer_class = StudentCardSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['card_number', 'student__user__first_name', 'student__user__last_name']
    ordering_fields = ['issue_date', 'expiration_date']
    ordering = ['-issue_date']

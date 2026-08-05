from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import DiaryEntry
from .serializers import DiaryEntrySerializer


class DiaryEntryViewSet(viewsets.ModelViewSet):
    queryset = DiaryEntry.objects.filter(is_active=True)
    serializer_class = DiaryEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['class_obj', 'subject', 'teacher']
    search_fields = ['content', 'homework']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']

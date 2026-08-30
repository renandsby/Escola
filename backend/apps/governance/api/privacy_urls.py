"""Rotas ``/api/v1/privacy/`` — conformidade LGPD."""

from django.urls import path

from .privacy_views import AnonymizeStudentView, ConsentView, SubjectDataExportView

urlpatterns = [
    path('my-data/', SubjectDataExportView.as_view(), name='privacy-my-data'),
    path('consents/', ConsentView.as_view(), name='privacy-consents'),
    path('anonymize/', AnonymizeStudentView.as_view(), name='privacy-anonymize'),
]

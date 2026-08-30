from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ReportCatalogView,
    ReportExecutionDetailView,
    ReportExecutionDownloadView,
    ReportExecutionFileView,
    ReportExecutionListCreateView,
    ReportViewSet,
)

router = DefaultRouter()
router.register(r'', ReportViewSet, basename='report')

urlpatterns = [
    path('catalog/', ReportCatalogView.as_view(), name='report-catalog'),
    path('executions/', ReportExecutionListCreateView.as_view(), name='report-executions'),
    path('executions/<uuid:pk>/', ReportExecutionDetailView.as_view(), name='report-execution'),
    path(
        'executions/<uuid:pk>/download/',
        ReportExecutionDownloadView.as_view(),
        name='report-execution-download',
    ),
    path(
        'executions/<uuid:pk>/file/',
        ReportExecutionFileView.as_view(),
        name='report-execution-file',
    ),
    path('', include(router.urls)),
]

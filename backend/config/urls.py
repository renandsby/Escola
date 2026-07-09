from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

api_urlpatterns = [
    path('accounts/', include('apps.accounts.urls')),
    path('schools/', include('apps.schools.urls')),
    path('students/', include('apps.students.urls')),
    path('guardians/', include('apps.guardians.urls')),
    path('teachers/', include('apps.teachers.urls')),
    path('subjects/', include('apps.subjects.urls')),
    path('classes/', include('apps.classes.urls')),
    path('classrooms/', include('apps.classrooms.urls')),
    path('enrollments/', include('apps.enrollments.urls')),
    path('grades/', include('apps.grades.urls')),
    path('attendance/', include('apps.attendance.urls')),
    path('diary/', include('apps.diary.urls')),
    path('curriculum/', include('apps.curriculum.urls')),
    path('history/', include('apps.history.urls')),
    path('messages/', include('apps.messages.urls')),
    path('notifications/', include('apps.notifications.urls')),
    path('documents/', include('apps.documents.urls')),
    path('student-cards/', include('apps.student_cards.urls')),
    path('audit/', include('apps.audit.urls')),
    path('reports/', include('apps.reports.urls')),
    path('dashboard/', include('apps.dashboard.urls')),
    path('backups/', include('apps.backups.urls')),
    path('integrations/', include('apps.integrations.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', include('apps.health.urls')),
    path('api/v1/', include(api_urlpatterns)),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

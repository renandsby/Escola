from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

api_urlpatterns = [
    path('accounts/', include('apps.authentication.api.urls')),
    path('schools/', include('apps.schools.api.urls')),
    path('students/', include('apps.students.api.student_urls')),
    path('guardians/', include('apps.students.api.guardian_urls')),
    path('teachers/', include('apps.classes.api.teacher_urls')),
    path('subjects/', include('apps.curriculum.api.subject_urls')),
    path('classes/', include('apps.classes.api.urls')),
    path('classrooms/', include('apps.classes.api.classroom_urls')),
    path('enrollments/', include('apps.students.api.enrollment_urls')),
    path('grades/', include('apps.class_diary.api.grade_urls')),
    path('attendance/', include('apps.class_diary.api.attendance_urls')),
    path('diary/', include('apps.class_diary.api.diary_urls')),
    path('curriculum/', include('apps.curriculum.api.urls')),
    path('sme/', include('apps.governance.api.sme_urls')),
    path('privacy/', include('apps.governance.api.privacy_urls')),
    path('evaluations/', include('apps.class_diary.api.evaluation_urls')),
    path('descriptive-evaluations/', include('apps.class_diary.api.evaluation_urls')),
    path('history/', include('apps.class_diary.api.history_urls')),
    path('communications/', include('apps.communications.urls')),
    path('notifications/', include('apps.notifications.urls')),
    path('documents/', include('apps.documents.urls')),
    path('student-cards/', include('apps.student_cards.urls')),
    path('audit/', include('apps.audit.urls')),
    path('reports/', include('apps.reports.api.urls')),
    path('admissions/', include('apps.admissions.api.urls')),
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

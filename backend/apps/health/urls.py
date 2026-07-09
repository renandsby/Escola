from django.urls import path
from .views import health, ready

urlpatterns = [
    path('', health, name='health'),
    path('ready/', ready, name='ready'),
]

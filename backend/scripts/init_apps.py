#!/usr/bin/env python
"""Script para inicializar automaticamente as apps Django."""

import os
from pathlib import Path

APPS_DIR = Path(__file__).resolve().parent.parent / 'apps'

APPS = [
    'schools',
    'students',
    'guardians',
    'teachers',
    'subjects',
    'classes',
    'classrooms',
    'enrollments',
    'grades',
    'attendance',
    'diary',
    'curriculum',
    'history',
    'messages',
    'notifications',
    'documents',
    'student_cards',
    'audit',
    'reports',
    'dashboard',
    'backups',
    'integrations',
]

TEMPLATES = {
    '__init__.py': 'default_app_config = "{app}.apps.{app_class}Config"',
    'apps.py': '''from django.apps import AppConfig


class {app_class}Config(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.{app}'
    verbose_name = '{verbose_name}'
''',
    'models.py': '''from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel, SchoolMixin


# Add models here
''',
    'serializers.py': '''from rest_framework import serializers


# Add serializers here
''',
    'views.py': '''from rest_framework import viewsets, permissions


# Add viewsets here
''',
    'urls.py': '''from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
# router.register(r'', YourViewSet, basename='')

urlpatterns = [
    path('', include(router.urls)),
]
''',
    'admin.py': '''from django.contrib import admin


# Register models here
''',
}


def create_app_files():
    """Criar arquivos para todas as apps."""
    for app_name in APPS:
        app_path = APPS_DIR / app_name
        app_path.mkdir(exist_ok=True)

        # Nome da classe da app
        app_class = ''.join(word.capitalize() for word in app_name.split('_'))

        # Verbose name em português
        verbose_names = {
            'schools': 'Escolas',
            'students': 'Alunos',
            'guardians': 'Responsáveis',
            'teachers': 'Professores',
            'subjects': 'Disciplinas',
            'classes': 'Turmas',
            'classrooms': 'Salas',
            'enrollments': 'Matrículas',
            'grades': 'Notas',
            'attendance': 'Frequência',
            'diary': 'Diário de Classe',
            'curriculum': 'Grade Curricular',
            'history': 'Histórico Escolar',
            'messages': 'Mensagens',
            'notifications': 'Notificações',
            'documents': 'Documentos',
            'student_cards': 'Carteirinhas',
            'audit': 'Auditoria',
            'reports': 'Relatórios',
            'dashboard': 'Dashboard',
            'backups': 'Backups',
            'integrations': 'Integrações',
        }
        verbose_name = verbose_names.get(app_name, app_name)

        for file_name, template in TEMPLATES.items():
            file_path = app_path / file_name

            if file_path.exists():
                print(f"✓ {app_path.name}/{file_name} já existe")
                continue

            content = template.format(
                app=app_name,
                app_class=app_class,
                verbose_name=verbose_name,
            )

            file_path.write_text(content)
            print(f"✓ Criado {app_path.name}/{file_name}")

    print(f"\n✓ Todas as {len(APPS)} apps foram inicializadas com sucesso!")


if __name__ == '__main__':
    create_app_files()

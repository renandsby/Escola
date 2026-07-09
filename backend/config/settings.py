import os
from pathlib import Path
from datetime import timedelta

import environ
from decouple import config as decouple_config

env = environ.Env(DEBUG=(bool, False))

BASE_DIR = Path(__file__).resolve().parent.parent

env.read_env(os.path.join(BASE_DIR.parent, '.env'))

SECRET_KEY = decouple_config(
    'SECRET_KEY',
    default='django-insecure-change-me-in-production'
)

DEBUG = decouple_config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = decouple_config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1'
).split(',')

ENVIRONMENT = decouple_config('ENVIRONMENT', default='development')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'django_filters',
    'django_redis',
    'apps.health',
    'apps.accounts',
    'apps.schools',
    'apps.students',
    'apps.guardians',
    'apps.teachers',
    'apps.subjects',
    'apps.classes',
    'apps.classrooms',
    'apps.enrollments',
    'apps.grades',
    'apps.attendance',
    'apps.diary',
    'apps.curriculum',
    'apps.history',
    'apps.messages',
    'apps.notifications',
    'apps.documents',
    'apps.student_cards',
    'apps.audit',
    'apps.reports',
    'apps.dashboard',
    'apps.backups',
    'apps.integrations',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': decouple_config('DB_ENGINE', default='django.db.backends.postgresql'),
        'NAME': decouple_config('DB_NAME', default='escola_db'),
        'USER': decouple_config('DB_USER', default='escola_user'),
        'PASSWORD': decouple_config('DB_PASSWORD', default='escola_password'),
        'HOST': decouple_config('DB_HOST', default='localhost'),
        'PORT': decouple_config('DB_PORT', default='5432'),
        'ATOMIC_REQUESTS': True,
        'CONN_MAX_AGE': 600,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    },
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(decouple_config('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', default='30'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(decouple_config('JWT_REFRESH_TOKEN_EXPIRE_DAYS', default='7'))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': decouple_config('JWT_ALGORITHM', default='HS256'),
    'SIGNING_KEY': decouple_config('JWT_SECRET_KEY', default=SECRET_KEY),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = decouple_config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000'
).split(',')

CORS_ALLOW_CREDENTIALS = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 1024 * 1024 * 10,
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': decouple_config('LOG_LEVEL', default='INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': decouple_config('LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
    },
}

REDIS_URL = decouple_config('REDIS_URL', default='redis://localhost:6379/0')

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

if not os.path.exists(BASE_DIR / 'logs'):
    os.makedirs(BASE_DIR / 'logs')

SPECTACULAR_SETTINGS = {
    'TITLE': 'Sistema de Gestão Escolar API',
    'DESCRIPTION': 'API REST para gerenciamento completo de escolas',
    'VERSION': '1.0.0',
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAdminUser'],
    'AUTHENTICATION_FLOWS': {
        'implicit': {
            'authorizationUrl': 'http://localhost/o/authorize/',
            'scopes': {
                'read': 'Read access',
                'write': 'Write access',
            }
        },
    },
    'SECURITY_DEFINITIONS': {
        'api_key': {
            'type': 'apiKey',
            'in': 'header',
            'name': 'Authorization'
        }
    },
}

SECURE_SSL_REDIRECT = False if DEBUG else True
SESSION_COOKIE_SECURE = False if DEBUG else True
CSRF_COOKIE_SECURE = False if DEBUG else True
CSRF_TRUSTED_ORIGINS = ALLOWED_HOSTS

if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

AUTH_USER_MODEL = 'accounts.User'

DEFAULT_FROM_EMAIL = decouple_config('EMAIL_HOST_USER', default='noreply@escola.com')
EMAIL_BACKEND = decouple_config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = decouple_config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = decouple_config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = decouple_config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = decouple_config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = decouple_config('EMAIL_HOST_PASSWORD', default='')

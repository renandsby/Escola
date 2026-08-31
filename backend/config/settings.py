import os
from pathlib import Path
from datetime import timedelta

import environ
from celery.schedules import crontab
from decouple import config as decouple_config
from django.core.exceptions import ImproperlyConfigured

env = environ.Env(DEBUG=(bool, False))

BASE_DIR = Path(__file__).resolve().parent.parent

env.read_env(os.path.join(BASE_DIR.parent, '.env'))


def _csv(name, default=''):
    """Lê uma variável separada por vírgula e devolve uma lista sem itens vazios."""
    return [item.strip() for item in decouple_config(name, default=default).split(',') if item.strip()]


SECRET_KEY = decouple_config(
    'SECRET_KEY',
    default='django-insecure-change-me-in-production'
)

DEBUG = decouple_config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = _csv('ALLOWED_HOSTS', default='localhost,127.0.0.1')

ENVIRONMENT = decouple_config('ENVIRONMENT', default='development')
IS_PRODUCTION = ENVIRONMENT.strip().lower() == 'production'

# ---------------------------------------------------------------------------
# Validação estrita de inicialização (P1-HARDEN):
# em produção a aplicação se recusa a subir com segredos padrão/curtos.
# ---------------------------------------------------------------------------
_INSECURE_SECRETS = {
    '',
    'django-insecure-change-me-in-production',
    'your-secret-key-change-in-production',
    'your-jwt-secret-key-change-in-production',
    'test-secret-key',
}

if IS_PRODUCTION:
    _jwt_key = decouple_config('JWT_SECRET_KEY', default='')
    _problems = []
    if DEBUG:
        _problems.append('DEBUG deve ser False em produção.')
    if (
        SECRET_KEY in _INSECURE_SECRETS
        or SECRET_KEY.startswith('django-insecure-')
        or len(SECRET_KEY) < 50
    ):
        _problems.append('SECRET_KEY ausente, padrão ou curta demais (mínimo 50 caracteres).')
    if _jwt_key in _INSECURE_SECRETS or len(_jwt_key) < 32:
        _problems.append('JWT_SECRET_KEY ausente, padrão ou curta demais (mínimo 32 caracteres).')
    if not ALLOWED_HOSTS or set(ALLOWED_HOSTS) <= {'localhost', '127.0.0.1', '0.0.0.0'}:
        _problems.append('ALLOWED_HOSTS não configurado para o(s) domínio(s) reais.')
    if _problems:
        raise ImproperlyConfigured(
            'Configuração insegura para ENVIRONMENT=production:\n  - ' + '\n  - '.join(_problems)
        )

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
    'django_filters',
    'django_redis',
    'core',
    'apps.health',
    'apps.authentication',
    'apps.governance',
    'apps.schools',
    'apps.students',
    'apps.classes',
    'apps.class_diary',
    'apps.curriculum',
    'apps.communications',
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

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

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
        'rest_framework.throttling.UserRateThrottle',
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

# Agendamentos fixos (celery-beat). P1-BACKUP: backup do banco toda noite.
CELERY_BEAT_SCHEDULE = {
    'nightly-database-backup': {
        'task': 'backups.run_nightly_backup',
        'schedule': crontab(hour=2, minute=0),  # 02:00 (fuso da app)
    },
}

if DEBUG:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }
else:
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

# Avisos de geração de schema (type hints de SerializerMethodField, APIViews sem
# serializer_class) — ruído no `manage.py check`; o schema ainda é gerado com
# fallback para string. Não afeta a segurança nem o runtime.
SILENCED_SYSTEM_CHECKS = ['drf_spectacular.W001', 'drf_spectacular.W002']

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

# ---------------------------------------------------------------------------
# Segurança de transporte e cabeçalhos (P1-HARDEN)
# ---------------------------------------------------------------------------
_DEV_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://0.0.0.0:8000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
CSRF_TRUSTED_ORIGINS = _csv('CSRF_TRUSTED_ORIGINS') or (
    [] if IS_PRODUCTION else _DEV_TRUSTED_ORIGINS
)

# nginx termina TLS e repassa o esquema original
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'

SECURE_SSL_REDIRECT = decouple_config('SECURE_SSL_REDIRECT', default=IS_PRODUCTION, cast=bool)
SESSION_COOKIE_SECURE = IS_PRODUCTION
CSRF_COOKIE_SECURE = IS_PRODUCTION
SESSION_COOKIE_HTTPONLY = True

if IS_PRODUCTION:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

AUTH_USER_MODEL = 'core.User'

AUTHENTICATION_BACKENDS = [
    'core.auth_backends.CPFOrEmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# Base pública do frontend — usada em links de e-mail (reset de senha etc.).
FRONTEND_BASE_URL = decouple_config(
    'FRONTEND_BASE_URL', default='http://localhost:3000'
).rstrip('/')

# Autenticação em dois fatores (TOTP / RFC 6238)
# Chave de criptografia dos segredos TOTP no banco (Fernet). Deriva da
# SECRET_KEY por padrão; defina TOTP_ENCRYPTION_KEY para rotacionar sem
# invalidar sessões JWT.
TOTP_ENCRYPTION_KEY = decouple_config('TOTP_ENCRYPTION_KEY', default='') or SECRET_KEY
TOTP_ISSUER_NAME = decouple_config('TOTP_ISSUER_NAME', default='Rede Municipal de Educação')

DEFAULT_FROM_EMAIL = decouple_config('EMAIL_HOST_USER', default='noreply@escola.com')

_EMAIL_BACKEND = decouple_config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend',
)

MAILERS = {
    'default': {
        'BACKEND': _EMAIL_BACKEND,
    },
}

# As OPTIONS abaixo só fazem sentido para o backend SMTP; outros backends
# (console, locmem, filebased) rejeitam ou ignoram esses parâmetros.
if _EMAIL_BACKEND.endswith('smtp.EmailBackend'):
    MAILERS['default']['OPTIONS'] = {
        'host': decouple_config('EMAIL_HOST', default='smtp.gmail.com'),
        'port': decouple_config('EMAIL_PORT', default=587, cast=int),
        'use_tls': decouple_config('EMAIL_USE_TLS', default=True, cast=bool),
        'username': decouple_config('EMAIL_HOST_USER', default=''),
        'password': decouple_config('EMAIL_HOST_PASSWORD', default=''),
    }

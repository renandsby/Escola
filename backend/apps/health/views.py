from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from django.core.cache import cache
import redis
from decouple import config


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    """Health check simples - verifica se a aplicação está rodando."""
    return Response(
        {
            'status': 'healthy',
            'message': 'API está operacional',
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def ready(request):
    """Ready check - verifica se todas as dependências estão disponíveis."""
    checks = {
        'database': False,
        'redis': False,
        'cache': False,
    }

    # Verificar banco de dados
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        checks['database'] = True
    except Exception as e:
        return Response(
            {
                'status': 'not_ready',
                'message': 'Banco de dados indisponível',
                'checks': checks,
                'error': str(e),
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Verificar Redis
    try:
        redis_url = config('REDIS_URL', default='redis://localhost:6379/0')
        r = redis.from_url(redis_url)
        r.ping()
        checks['redis'] = True
    except Exception as e:
        return Response(
            {
                'status': 'not_ready',
                'message': 'Redis indisponível',
                'checks': checks,
                'error': str(e),
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Verificar cache
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            checks['cache'] = True
    except Exception as e:
        return Response(
            {
                'status': 'not_ready',
                'message': 'Cache indisponível',
                'checks': checks,
                'error': str(e),
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            'status': 'ready',
            'message': 'API pronta para receber requisições',
            'checks': checks,
        },
        status=status.HTTP_200_OK,
    )

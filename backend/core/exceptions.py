from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


class BusinessLogicError(Exception):
    """Erro de lógica de negócio de domínio.

    Deve ser levantado inline onde necessário, ex.:
    ``raise BusinessLogicError(code="CLASS_CAPACITY_EXCEEDED", message="...")``.
    """

    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def custom_exception_handler(exc, context):
    """Handler customizado de exceções.

    Garante que toda resposta de erro da API siga o envelope padrão
    documentado em ``doc/ARCHITECTURE_BACKEND_DJANGO.md`` §4.
    """
    response = exception_handler(exc, context)

    if isinstance(exc, BusinessLogicError):
        return Response(
            {
                'success': False,
                'error': {
                    'code': exc.code,
                    'message': exc.message,
                    'details': None,
                },
            },
            status=exc.status_code,
        )

    if isinstance(exc, DRFValidationError):
        return Response(
            {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Dados inválidos enviados na requisição.',
                    'details': response.data if response else exc.detail,
                },
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if response is not None:
        return Response(
            {
                'success': False,
                'error': {
                    'code': exc.__class__.__name__.upper(),
                    'message': str(exc),
                    'details': response.data,
                },
            },
            status=response.status_code,
        )

    return Response(
        {
            'success': False,
            'error': {
                'code': 'INTERNAL_SERVER_ERROR',
                'message': 'Ocorreu um erro interno inesperado no servidor.',
                'details': None,
            },
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Handler customizado de exceções."""
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'status': 'error',
            'message': response.data.get('detail') or 'Erro na requisição',
            'errors': response.data if isinstance(response.data, dict) else None,
        }
        response.status_code = response.status_code

    return response


class ValidationError(Exception):
    """Erro de validação customizado."""

    def __init__(self, message, code=None):
        self.message = message
        self.code = code
        super().__init__(self.message)


class BusinessLogicError(Exception):
    """Erro de lógica de negócio."""

    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class SchoolNotFound(Exception):
    """Escola não encontrada."""

    def __init__(self):
        super().__init__('Escola não encontrada')


class StudentNotFound(Exception):
    """Aluno não encontrado."""

    def __init__(self):
        super().__init__('Aluno não encontrado')


class TeacherNotFound(Exception):
    """Professor não encontrado."""

    def __init__(self):
        super().__init__('Professor não encontrado')


class EnrollmentNotFound(Exception):
    """Matrícula não encontrada."""

    def __init__(self):
        super().__init__('Matrícula não encontrada')


class InvalidStatusTransition(Exception):
    """Transição de status inválida."""

    def __init__(self, current_status, new_status):
        self.message = f'Não é possível mudar de {current_status} para {new_status}'
        super().__init__(self.message)


class DuplicateEnrollment(Exception):
    """Tentativa de criar matrícula duplicada."""

    def __init__(self):
        super().__init__('Este aluno já está matriculado nesta turma')


class InsufficientPermission(Exception):
    """Permissão insuficiente."""

    def __init__(self):
        super().__init__('Você não tem permissão para realizar esta ação')

import json
import logging

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

_WRITE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
_ACTION_BY_METHOD = {'POST': 'CREATE', 'PUT': 'UPDATE', 'PATCH': 'UPDATE', 'DELETE': 'DELETE'}

# Rotas sem valor negocial para a trilha
_IGNORED_PREFIXES = (
    '/health',
    '/api/schema',
    '/static',
    '/media',
    '/admin/jsi18n',
    '/api/v1/accounts/token/refresh',
    '/api/v1/accounts/logout',
)
_LOGIN_PATHS = (
    '/api/v1/accounts/login/', '/api/v1/accounts/login',
    '/api/v1/accounts/totp/verify/', '/api/v1/accounts/totp/verify',
)


class AuditMiddleware(MiddlewareMixin):
    """Persiste na tabela ``AuditLog`` toda escrita bem-sucedida na API."""

    def process_request(self, request):
        request._audit_body = None
        if request.method in _WRITE_METHODS and _is_auditable(request.path):
            try:
                if request.body:
                    request._audit_body = json.loads(request.body)
            except (json.JSONDecodeError, UnicodeDecodeError):
                request._audit_body = None
        return None

    def process_response(self, request, response):
        method = request.method
        if method != 'POST' and method not in _WRITE_METHODS:
            return response

        if request.path in _LOGIN_PATHS and method == 'POST':
            self._audit_login(request, response)
            return response

        if (
            method in _WRITE_METHODS
            and _is_auditable(request.path)
            and response.status_code < 400
        ):
            self._persist(request, response)
        return response

    def _audit_login(self, request, response):
        from apps.audit.services.audit_service import log_action

        ok = response.status_code < 400
        body = request._audit_body if isinstance(request._audit_body, dict) else {}
        username = str(body.get('username', ''))[:150]

        # dados do corpo da resposta (para a etapa 2FA e o /totp/verify/)
        requires_2fa = False
        resp = self._response_json(response)
        if isinstance(resp, dict):
            requires_2fa = bool(resp.get('requires_2fa'))
            if not username:
                username = str((resp.get('user') or {}).get('username', ''))[:150]

        # Login válido de usuário/senha que ainda exige o 2º fator → só o desafio,
        # não é uma sessão iniciada.
        if ok and requires_2fa:
            action = 'LOGIN_2FA_CHALLENGE'
            completed = False
        elif ok:
            action = 'LOGIN'
            completed = True
        else:
            action = 'LOGIN_FAILED'
            completed = False

        user = None
        if username:
            from core.models import User

            user = User.objects.filter(username=username).first()

        if completed and user is not None:
            try:
                from apps.authentication.models import LoginLog

                LoginLog.objects.create(
                    user=user,
                    ip_address=self.get_client_ip(request) or '0.0.0.0',
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    success=True,
                )
            except Exception:  # noqa: BLE001
                logger.exception('Falha ao gravar LoginLog')

        log_action(
            user=user if completed or action == 'LOGIN_2FA_CHALLENGE' else None,
            action=action,
            resource='auth',
            resource_id=username,
            details={'success': ok, 'status_code': response.status_code},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_method='POST',
            request_path=request.path,
            status_code=response.status_code,
        )

    @staticmethod
    def _response_json(response):
        try:
            content = getattr(response, 'content', b'')
            if not content:
                return None
            return json.loads(content)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            return None

    def _persist(self, request, response):
        from apps.audit.services.audit_service import log_action

        resource, resource_id = _resource_from_path(request.path)
        user = getattr(request, 'user', None)
        details = {'request': request._audit_body} if request._audit_body is not None else {}
        details['status_code'] = response.status_code

        log_action(
            user=user,
            action=_ACTION_BY_METHOD.get(request.method, request.method),
            resource=resource,
            resource_id=resource_id,
            details=details,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            request_method=request.method,
            request_path=request.path,
            status_code=response.status_code,
        )

    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


def _is_auditable(path: str) -> bool:
    return path.startswith('/api/') and not path.startswith(_IGNORED_PREFIXES)


def _resource_from_path(path: str):
    """`/api/v1/students/<uuid>/` -> ('students', '<uuid>')."""
    parts = [p for p in path.split('/') if p]
    # ['api', 'v1', 'students', '<id>', ...]
    if len(parts) < 3:
        return path, None
    resource = parts[2]
    resource_id = None
    if len(parts) >= 4 and parts[3] not in {'', 'bulk', 'batch-upsert'}:
        resource_id = parts[3]
    return resource, resource_id

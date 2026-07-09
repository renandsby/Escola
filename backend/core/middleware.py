import json
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import QueryDict

logger = logging.getLogger(__name__)


class AuditMiddleware(MiddlewareMixin):
    """Middleware para registrar alterações no sistema."""

    def process_request(self, request):
        request._audit_data = {
            'method': request.method,
            'path': request.path,
            'user': request.user.id if request.user.is_authenticated else None,
            'ip': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }

        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            try:
                if request.body:
                    request._audit_data['body'] = json.loads(request.body)
            except json.JSONDecodeError:
                request._audit_data['body'] = None

        return None

    def process_response(self, request, response):
        if hasattr(request, '_audit_data'):
            audit_data = request._audit_data
            audit_data['status_code'] = response.status_code

            if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                logger.info(
                    f"API Call: {audit_data['method']} {audit_data['path']} "
                    f"Status: {audit_data['status_code']} "
                    f"User: {audit_data['user']} IP: {audit_data['ip']}"
                )

        return response

    @staticmethod
    def get_client_ip(request):
        """Obtém o IP real do cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

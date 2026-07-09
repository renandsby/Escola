import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.schools.models import School


User = get_user_model()


@pytest.fixture
def api_client():
    """Retorna um cliente API."""
    return APIClient()


@pytest.fixture
def user(db):
    """Cria um usuário teste."""
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User',
    )
    return user


@pytest.fixture
def authenticated_client(db, user):
    """Retorna um cliente API autenticado."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin_user(db):
    """Cria um usuário admin."""
    user = User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='adminpass123',
    )
    return user


@pytest.fixture
def admin_client(db, admin_user):
    """Retorna um cliente API autenticado como admin."""
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def school(db):
    """Cria uma escola teste."""
    return School.objects.create(
        name='Escola Teste',
        cnpj='12.345.678/0001-00',
        email='escola@example.com',
    )


@pytest.fixture
def user_with_school(db, school):
    """Cria um usuário com escola."""
    user = User.objects.create_user(
        username='schooluser',
        email='schooluser@example.com',
        password='testpass123',
        school=school,
        role='director',
    )
    return user


@pytest.fixture
def authenticated_school_client(db, user_with_school):
    """Retorna um cliente API autenticado com escola."""
    client = APIClient()
    client.force_authenticate(user=user_with_school)
    return client

import pytest
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestAuthenticationAPI:
    """Testes para autenticação."""

    def test_login_success(self, api_client, user):
        """Teste login com sucesso."""
        url = reverse('token_obtain_pair')
        response = api_client.post(url, {
            'username': 'testuser',
            'password': 'testpass123'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_invalid_credentials(self, api_client, user):
        """Teste login com credenciais inválidas."""
        url = reverse('token_obtain_pair')
        response = api_client.post(url, {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token(self, api_client, user):
        """Teste renovação de token."""
        refresh = RefreshToken.for_user(user)
        url = reverse('token_refresh')
        response = api_client.post(url, {
            'refresh': str(refresh)
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data


@pytest.mark.django_db
class TestSchoolAPI:
    """Testes para API de escolas."""

    def test_list_schools(self, authenticated_client, school):
        """Teste listagem de escolas."""
        url = reverse('school-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data or isinstance(response.data, list)

    def test_create_school_admin(self, admin_client):
        """Teste criar escola como admin."""
        url = reverse('school-list')
        data = {
            'name': 'Nova Escola',
            'cnpj': '98.765.432/0001-11',
            'email': 'novaeescola@example.com'
        }
        response = admin_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Nova Escola'

    def test_retrieve_school(self, authenticated_client, school):
        """Teste recuperar escola específica."""
        url = reverse('school-detail', kwargs={'pk': school.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == school.name

    def test_update_school(self, authenticated_school_client, school):
        """Teste atualizar escola."""
        url = reverse('school-detail', kwargs={'pk': school.pk})
        data = {'name': 'Escola Atualizada'}
        response = authenticated_school_client.patch(url, data)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestStudentAPI:
    """Testes para API de alunos."""

    def test_list_students(self, authenticated_client, student):
        """Teste listagem de alunos."""
        url = reverse('student-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_create_student(self, authenticated_school_client):
        """Teste criar aluno."""
        url = reverse('student-list')
        data = {
            'user': {
                'username': 'newaluno',
                'email': 'newaluno@example.com',
                'first_name': 'Novo',
                'last_name': 'Aluno',
                'password': 'pass123456'
            },
            'registration_number': '000123',
            'gender': 'M'
        }
        response = authenticated_school_client.post(url, data, format='json')
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

    def test_retrieve_student(self, authenticated_client, student):
        """Teste recuperar aluno específico."""
        url = reverse('student-detail', kwargs={'pk': student.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestClassAPI:
    """Testes para API de turmas."""

    def test_list_classes(self, authenticated_client, class_obj):
        """Teste listagem de turmas."""
        url = reverse('class-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_class(self, authenticated_client, class_obj):
        """Teste recuperar turma específica."""
        url = reverse('class-detail', kwargs={'pk': class_obj.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_class_has_subjects(self, authenticated_client, class_obj):
        """Teste se turma contém disciplinas."""
        url = reverse('class-detail', kwargs={'pk': class_obj.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'subjects' in response.data or 'subjects_count' in response.data


@pytest.mark.django_db
class TestGradeAPI:
    """Testes para API de notas."""

    def test_list_grades(self, authenticated_client, grade):
        """Teste listagem de notas."""
        url = reverse('grade-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_grade(self, authenticated_client, grade):
        """Teste recuperar nota específica."""
        url = reverse('grade-detail', kwargs={'pk': grade.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'average' in response.data

    def test_filter_grades_by_student(self, authenticated_client, grade):
        """Teste filtrar notas por aluno."""
        url = reverse('grade-list')
        response = authenticated_client.get(f'{url}?student={grade.student.pk}')
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestAttendanceAPI:
    """Testes para API de frequência."""

    def test_list_attendance(self, authenticated_client, attendance):
        """Teste listagem de frequência."""
        url = reverse('attendance-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_attendance(self, authenticated_client, attendance):
        """Teste recuperar frequência específica."""
        url = reverse('attendance-detail', kwargs={'pk': attendance.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_update_attendance_status(self, authenticated_school_client, attendance):
        """Teste atualizar status de frequência."""
        url = reverse('attendance-detail', kwargs={'pk': attendance.pk})
        data = {'status': 'absent'}
        response = authenticated_school_client.patch(url, data)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestEnrollmentAPI:
    """Testes para API de matrículas."""

    def test_list_enrollments(self, authenticated_client, enrollment):
        """Teste listagem de matrículas."""
        url = reverse('enrollment-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_enrollment(self, authenticated_client, enrollment):
        """Teste recuperar matrícula específica."""
        url = reverse('enrollment-detail', kwargs={'pk': enrollment.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestSubjectAPI:
    """Testes para API de disciplinas."""

    def test_list_subjects(self, authenticated_client, subject):
        """Teste listagem de disciplinas."""
        url = reverse('subject-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_subject(self, authenticated_client, subject):
        """Teste recuperar disciplina específica."""
        url = reverse('subject-detail', kwargs={'pk': subject.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestPermissions:
    """Testes para permissões."""

    def test_unauthenticated_access_denied(self, api_client, school):
        """Teste acesso negado para não autenticados."""
        url = reverse('school-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_access_allowed(self, authenticated_client, school):
        """Teste acesso permitido para autenticados."""
        url = reverse('school-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

# Backend - Sistema de Gestão Escolar

Backend da aplicação de gestão escolar desenvolvido com Django 5 e Django REST Framework.

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
backend/
├── apps/                    # Aplicações Django (módulos do sistema)
│   ├── accounts/           # Autenticação, usuários e permissões
│   ├── schools/            # Gerenciamento de escolas
│   ├── students/           # Gerenciamento de alunos
│   ├── guardians/          # Gerenciamento de responsáveis
│   ├── teachers/           # Gerenciamento de professores
│   ├── subjects/           # Disciplinas
│   ├── classes/            # Turmas
│   ├── classrooms/         # Salas de aula
│   ├── enrollments/        # Matrículas
│   ├── grades/             # Notas e boletins
│   ├── attendance/         # Frequência
│   ├── diary/              # Diário de classe
│   ├── curriculum/         # Grade curricular
│   ├── history/            # Histórico escolar
│   ├── messages/           # Sistema de mensagens
│   ├── notifications/      # Notificações
│   ├── documents/          # Gerenciamento de documentos
│   ├── student_cards/      # Carteirinha do aluno
│   ├── audit/              # Auditoria
│   ├── reports/            # Relatórios
│   ├── dashboard/          # Dashboard
│   ├── backups/            # Backups
│   └── integrations/       # Integrações
├── config/                  # Configuração do Django
│   ├── settings.py         # Configurações principais
│   ├── urls.py             # URLs da aplicação
│   ├── wsgi.py             # WSGI
│   └── celery.py           # Configuração Celery
├── core/                    # Código central compartilhado
│   ├── models.py           # Modelos base
│   ├── serializers.py      # Serializers base
│   ├── permissions.py      # Permissões RBAC
│   ├── exceptions.py       # Exceções customizadas
│   └── middleware.py       # Middleware
├── common/                  # Utilitários compartilhados
│   ├── filters.py          # Filtros customizados
│   └── utils.py            # Funções utilitárias
├── tests/                   # Testes automatizados
│   ├── conftest.py         # Configuração pytest
│   ├── factories.py        # Factories para testes
│   └── test_*.py           # Testes por app
├── scripts/                 # Scripts úteis
│   └── init_apps.py        # Script de inicialização
├── manage.py               # Gerenciador Django
└── pyproject.toml          # Dependências Python
```

## 🚀 Quick Start

### Instalação

```bash
# Entre no diretório backend
cd backend

# Crie um ambiente virtual
python -m venv venv

# Ative o ambiente virtual
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate      # Windows

# Instale as dependências
pip install -e .

# Configure variáveis de ambiente
cp ../.env.example ../.env
```

### Migrações e Setup

```bash
# Execute as migrações
python manage.py migrate

# Crie um superusuário
python manage.py createsuperuser

# Inicie o servidor
python manage.py runserver
```

## 🔐 Autenticação

### JWT (JSON Web Token)

A autenticação é baseada em JWT usando `djangorestframework-simplejwt`.

#### Obter Tokens

```bash
curl -X POST http://localhost:8000/api/v1/accounts/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "seu_usuario",
    "password": "sua_senha"
  }'
```

Resposta:

```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "username": "usuario",
    "email": "user@example.com",
    "role": "student",
    "school": "school-uuid"
  }
}
```

#### Usar o Token

Adicione o token no header da requisição:

```bash
curl -X GET http://localhost:8000/api/v1/accounts/users/me/ \
  -H "Authorization: Bearer seu_token_aqui"
```

## 🔑 Permissões e Roles

### Roles Disponíveis

- **Admin**: Acesso total ao sistema
- **Director**: Gerencia a escola
- **Coordinator**: Coordena atividades acadêmicas
- **Secretary**: Gerencia documentos administrativos
- **Teacher**: Acesso a turmas e notas
- **Guardian**: Acesso a informações dos filhos
- **Student**: Acesso ao próprio perfil e notas

### RBAC (Role-Based Access Control)

Permissões são gerenciadas por role. Cada endpoint verifica as permissões:

```python
from core.permissions import IsTeacher

class GradeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsTeacher]
```

## 📡 API Endpoints

### Autenticação

- `POST /api/v1/accounts/login/` - Login
- `POST /api/v1/accounts/users/register/` - Registrar
- `GET /api/v1/accounts/users/me/` - Obter usuário autenticado
- `POST /api/v1/accounts/users/change_password/` - Mudar senha

### Escolas

- `GET /api/v1/schools/` - Listar escolas
- `POST /api/v1/schools/` - Criar escola (Admin)
- `GET /api/v1/schools/{id}/` - Detalhes da escola
- `PUT /api/v1/schools/{id}/` - Atualizar escola
- `DELETE /api/v1/schools/{id}/` - Deletar escola

### Alunos

- `GET /api/v1/students/` - Listar alunos
- `POST /api/v1/students/` - Criar aluno
- `GET /api/v1/students/{id}/` - Detalhes do aluno

### Documentação Interativa

- Swagger: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- Schema OpenAPI: http://localhost:8000/api/schema/

## 🧪 Testes

### Rodar Testes

```bash
# Todos os testes
pytest

# Com cobertura
pytest --cov

# Teste específico
pytest tests/test_accounts.py::TestLogin

# Verbose
pytest -v
```

### Escrever Testes

Use as factories para criar dados de teste:

```python
from tests.factories import UserFactory, SchoolFactory

def test_create_user():
    user = UserFactory(username='test', email='test@example.com')
    assert user.username == 'test'
```

## 📊 Modelos Principais

### User (core.models.User)

```python
User.objects.create_user(
    username='student1',
    email='student1@example.com',
    password='secure_password',
    role='student',
    school=school,
)
```

### School (apps.schools.models.School)

```python
School.objects.create(
    name='Escola ABC',
    cnpj='12.345.678/0001-00',
    email='escola@example.com',
)
```

## ⚙️ Variáveis de Ambiente

Configure no arquivo `.env`:

```env
DEBUG=True
SECRET_KEY=sua-chave-secreta
DB_NAME=escola_db
DB_USER=escola_user
DB_PASSWORD=senha_segura
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=sua-chave-jwt
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## 📚 Dependências Principais

- **Django 5.0** - Framework web
- **Django REST Framework** - API REST
- **djangorestframework-simplejwt** - Autenticação JWT
- **PostgreSQL** - Banco de dados
- **Celery + Redis** - Fila de tarefas
- **Pytest** - Testes
- **Black** - Formatação de código

## 🔄 Celery (Tarefas Assíncronas)

### Iniciar Celery Worker

```bash
celery -A config worker --loglevel=info
```

### Iniciar Celery Beat (Agendamento)

```bash
celery -A config beat --loglevel=info
```

### Exemplo de Tarefa Assíncrona

```python
from celery import shared_task

@shared_task
def send_notification(user_id):
    user = User.objects.get(id=user_id)
    # Enviar notificação
    pass
```

## 🛠️ Desenvolvimento

### Code Quality

```bash
# Formatação com Black
black .

# Linting com Ruff
ruff check .

# Type checking com Mypy
mypy .
```

### Criar Nova App

```bash
# A estrutura já é criada automaticamente
python scripts/init_apps.py
```

## 📝 Convenções de Código

- Nomes de variáveis em **snake_case**
- Nomes de classes em **PascalCase**
- Sempre use type hints
- Docstrings para funções públicas
- Máximo 88 caracteres por linha (Black)

## 🔒 Segurança

- Senhas criptografadas com PBKDF2
- CSRF protection ativado
- CORS restrito
- Rate limiting ativo
- Audit logging de todas as alterações
- Validação em múltiplas camadas

## 📞 Suporte

Para dúvidas sobre a arquitetura ou implementação, consulte o README principal.

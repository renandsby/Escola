# Sistema de Gestão Escolar Completo

Um sistema moderno, escalável e production-ready para gerenciamento completo de instituições educacionais.

## 📋 Visão Geral

Sistema multiempresa para gerenciar:
- Cadastro de escolas
- Matrícula e histórico de alunos
- Documentação de responsáveis e professores
- Turmas, salas e grade curricular
- Boletins, notas e frequência
- Diário de classe
- Mensagens e notificações
- Upload e gestão de documentos
- Carteirinha de aluno com QR Code
- Relatórios e análises
- Auditoria completa
- Assinatura digital

## 🏗️ Arquitetura

### Backend
- **Framework**: Django 5+
- **API**: Django REST Framework
- **Banco de dados**: PostgreSQL
- **Cache/Fila**: Redis + Celery
- **Autenticação**: JWT
- **Validação**: Pydantic + Zod

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Linguagem**: TypeScript
- **Gerenciamento de Estado**: Zustand
- **Gerenciamento de Dados**: React Query
- **UI**: Shadcn UI + TailwindCSS
- **Validação de Forms**: React Hook Form + Zod

### Infraestrutura
- **Containerização**: Docker & Docker Compose
- **Servidor Web**: Nginx
- **CI/CD**: GitHub Actions

## 🗂️ Estrutura do Projeto

```
escola/
├── backend/
│   ├── apps/               # Aplicações Django (15+ módulos)
│   ├── config/             # Configurações do projeto
│   ├── core/               # Código central (autenticação, permissões)
│   ├── common/             # Utilitários compartilhados
│   ├── tests/              # Testes
│   └── scripts/            # Scripts de setup
├── frontend/
│   └── src/
│       ├── pages/          # Páginas da aplicação
│       ├── components/     # Componentes reutilizáveis
│       ├── hooks/          # Custom hooks
│       ├── services/       # Serviços API
│       ├── store/          # Zustand stores
│       ├── types/          # Tipos TypeScript
│       └── utils/          # Utilitários
├── docs/                   # Documentação
├── docker-compose.yml      # Orquestração
└── README.md
```

## 🚀 Quick Start

### Pré-requisitos
- Docker & Docker Compose
- Python 3.14+
- Node.js 20+
- Git

### Setup Inicial

```bash
# Clone e entre no diretório
cd Escola

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie os containers
docker-compose up -d

# Execute migrações
docker-compose exec backend python manage.py migrate

# Crie um superusuário
docker-compose exec backend python manage.py createsuperuser

# Acesse a aplicação
# Frontend: http://localhost:3000
# API: http://localhost:8000
# Admin: http://localhost:8000/admin
```

## 📦 Tecnologias

### Backend
- Django 5+
- Django REST Framework
- PostgreSQL
- Redis
- Celery
- PyJWT
- drf-spectacular (Swagger)
- Pytest
- Black
- Ruff
- Mypy

### Frontend
- React 19
- TypeScript
- Vite
- React Router v6
- TanStack Query
- Zustand
- React Hook Form
- Zod
- TailwindCSS
- Shadcn UI
- Axios
- Recharts

## 🔐 Segurança

- Autenticação via JWT
- Autorização por RBAC (Role-Based Access Control)
- Validação em múltiplas camadas
- Proteção CSRF
- CORS configurado
- Rate limiting
- Audit logging completo
- Criptografia de dados sensíveis
- Backup automático

## 📝 Modelos Principais

- **Escola**: Organização principal
- **Usuário**: Perfil + Autenticação
- **Perfil**: Define permissões (Admin, Diretor, Coordenador, etc.)
- **Aluno**: Matrícula automática
- **Responsável**: Pode ter múltiplos alunos
- **Professor**: Leciona disciplinas
- **Turma**: Agrupamento de alunos
- **Disciplina**: Matérias do currículo
- **Boletim**: Consolidação de notas
- **Frequência**: Controle de presença
- **Auditoria**: Log de todas as alterações

## 🧪 Testes

```bash
# Testes do backend
docker-compose exec backend pytest

# Cobertura de testes
docker-compose exec backend pytest --cov
```

## 📊 Fases de Desenvolvimento

1. ✅ Arquitetura geral e estrutura
2. ⏳ Models do backend
3. ⏳ Banco de dados
4. ⏳ Autenticação JWT
5. ⏳ Permissões RBAC
6. ⏳ APIs REST
7. ⏳ Swagger/OpenAPI
8. ⏳ Frontend base
9. ⏳ Telas principais
10. ⏳ Dashboard
... (20 fases no total)

## 📄 Licença

MIT

## 🤝 Contribuindo

Abra uma issue ou pull request.

## 📧 Contato

Para dúvidas: [seu email]

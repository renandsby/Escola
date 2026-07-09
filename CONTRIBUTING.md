# Guia de Contribuição

Bem-vindo ao Sistema de Gestão Escolar! Este documento descreve como configurar o ambiente de desenvolvimento e contribuir para o projeto.

## 📋 Índice

- [Setup Inicial](#setup-inicial)
- [Fluxo de Desenvolvimento](#fluxo-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Testes](#testes)
- [Commits](#commits)
- [Pull Requests](#pull-requests)
- [Estrutura de Diretórios](#estrutura-de-diretórios)

## 🚀 Setup Inicial

### Opção 1: Usando o Script de Setup (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/Escola.git
cd Escola

# Execute o script de setup
chmod +x scripts/setup.sh
./scripts/setup.sh
```

O script irá:
- ✓ Verificar dependências (Docker, Node.js, Python)
- ✓ Criar arquivo `.env`
- ✓ Iniciar containers Docker
- ✓ Executar migrações
- ✓ Criar superusuário padrão
- ✓ Instalar dependências do frontend

### Opção 2: Setup Manual

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/Escola.git
cd Escola

# Criar .env
cp .env.example .env

# Iniciar containers
docker-compose up -d

# Aguardar 5 segundos para banco ficar pronto
sleep 5

# Migrações
docker-compose exec backend python manage.py migrate

# Superusuário
docker-compose exec backend python manage.py createsuperuser

# Instalar deps frontend
cd frontend && npm install && cd ..
```

### URLs Disponíveis

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api/v1
- **Admin:** http://localhost:8000/admin
- **Swagger:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc

**Credenciais Padrão:**
- Usuário: `admin`
- Senha: `admin123`

---

## 🔄 Fluxo de Desenvolvimento

### 1. Criar Nova Branch

```bash
# Sempre criar branch a partir de main
git checkout main
git pull origin main

# Criar branch com padrão: feature/nome-feature ou fix/nome-bug
git checkout -b feature/sua-funcionalidade
```

### 2. Fazer Alterações

#### Backend (Django)

```bash
# Editar código em backend/

# Executar testes
docker-compose exec backend pytest

# Verificar linting
docker-compose exec backend ruff check .
docker-compose exec backend black --check .
docker-compose exec backend mypy .

# Formatar código
docker-compose exec backend black .
docker-compose exec backend ruff check --fix .
```

#### Frontend (React)

```bash
# Editar código em frontend/

# Executar testes
cd frontend && npm run test

# Verificar linting
cd frontend && npm run lint

# Formatar código
cd frontend && npm run format
```

### 3. Commit

```bash
# Stage changes
git add .

# Commit com mensagem descritiva
git commit -m "feat: descrição da funcionalidade"

# Push para remote
git push origin feature/sua-funcionalidade
```

### 4. Pull Request

- Abra uma PR no GitHub
- Descreva o que foi mudado
- Referencie issues relacionadas (#123)
- Aguarde review

---

## 📏 Padrões de Código

### Backend (Python/Django)

#### Convenções

- Variáveis: `snake_case`
- Classes: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Máximo 88 caracteres por linha (Black)

#### Exemplos

```python
# ✓ Bom
class StudentSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

# ✗ Ruim
class StudentSerializer(serializers.ModelSerializer):
    fullname = serializers.SerializerMethodField()
    
    def get_fullname(self, obj):
        return obj.first_name + ' ' + obj.last_name
```

#### Imports

```python
# Ordem: stdlib, third-party, local
import os
from datetime import datetime

from django.db import models
from rest_framework import serializers

from core.models import BaseModel
from .utils import format_date
```

#### Type Hints

```python
# ✓ Use type hints
def calculate_average(grades: list[float]) -> float:
    return sum(grades) / len(grades) if grades else 0.0

# Docstrings para funções públicas
def create_student(name: str, email: str) -> 'Student':
    """Cria um novo aluno.
    
    Args:
        name: Nome completo
        email: Email válido
        
    Returns:
        Instância de Student criada
    """
    pass
```

### Frontend (TypeScript/React)

#### Convenções

- Componentes: `PascalCase`
- Hooks: `useCamelCase`
- Variáveis/funções: `camelCase`
- Arquivos de componentes: `PascalCase.tsx`
- Máximo 88 caracteres por linha (Prettier)

#### Exemplos

```typescript
// ✓ Bom
interface User {
  id: string
  firstName: string
  email: string
}

export function UserCard({ user }: { user: User }) {
  return (
    <div className="p-4 bg-white rounded">
      <h2>{user.firstName}</h2>
      <p>{user.email}</p>
    </div>
  )
}

// ✗ Ruim
export function usercard({ data }: any) {
  return <div>{data.firstname} - {data.mail}</div>
}
```

#### Imports

```typescript
// Ordem: React, libs externas, locais
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/Button'
import { useAuthStore } from '@/store/auth'
```

---

## 🧪 Testes

### Backend

```bash
# Todos os testes
docker-compose exec backend pytest

# Com coverage
docker-compose exec backend pytest --cov

# Teste específico
docker-compose exec backend pytest tests/test_accounts.py::TestLogin

# Verbose
docker-compose exec backend pytest -v
```

#### Exemplo de Teste

```python
# backend/tests/test_students.py
import pytest
from tests.factories import StudentFactory, SchoolFactory

@pytest.mark.django_db
def test_create_student():
    school = SchoolFactory()
    student = StudentFactory(school=school)
    
    assert student.school == school
    assert student.role == 'student'
```

### Frontend

```bash
cd frontend

# Todos os testes
npm run test

# Com coverage
npm run test:coverage

# Modo watch
npm run test -- --watch
```

#### Exemplo de Teste

```typescript
// frontend/src/pages/auth/__tests__/LoginPage.test.tsx
import { render, screen } from '@testing-library/react'
import LoginPage from '../LoginPage'

describe('LoginPage', () => {
  it('deve renderizar form de login', () => {
    render(<LoginPage />)
    
    expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })
})
```

---

## 📝 Commits

### Formato de Mensagem

Use o padrão Conventional Commits:

```
<tipo>(<escopo>): <descrição>

<corpo>

<rodapé>
```

### Tipos

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação (não afeta código)
- `refactor:` Refatoração sem mudança funcional
- `perf:` Melhoria de performance
- `test:` Adição ou modificação de testes
- `chore:` Configuração, dependências

### Exemplos

```bash
# Boa
git commit -m "feat(students): adicionar endpoint de listar alunos"
git commit -m "fix(grades): corrigir cálculo de média ponderada"
git commit -m "docs: atualizar README com instruções de setup"

# Ruim
git commit -m "arrumei"
git commit -m "atualizei varias coisas"
git commit -m "wip: trabalho em progresso"
```

---

## 🔀 Pull Requests

### Checklist

Antes de abrir uma PR, verifique:

- [ ] Código segue os padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Todos os testes passam
- [ ] Documentação foi atualizada (se necessário)
- [ ] Commits têm mensagens claras
- [ ] Branch está atualizada com main

### Descrição da PR

```markdown
## Descrição
Breve descrição do que foi mudado e por quê.

## Tipo de Mudança
- [ ] Nova funcionalidade
- [ ] Correção de bug
- [ ] Breaking change
- [ ] Atualização de documentação

## Como Testar
Passos para testar a mudança:
1. ...
2. ...

## Screenshots (se aplicável)
[Cole screenshots aqui]

## Issues Relacionadas
Closes #123
```

---

## 📁 Estrutura de Diretórios

### Backend

```
backend/
├── apps/                    # Apps Django (um módulo por app)
│   ├── accounts/           # Autenticação e usuários
│   ├── schools/            # Escolas
│   ├── students/           # Alunos
│   └── ...
├── config/                 # Configuração do Django
├── core/                   # Código compartilhado
├── common/                 # Utilitários
├── tests/                  # Testes
├── manage.py
└── pyproject.toml
```

### Frontend

```
frontend/
├── src/
│   ├── pages/              # Páginas da aplicação
│   │   ├── auth/
│   │   ├── dashboard/
│   │   └── ...
│   ├── components/         # Componentes reutilizáveis
│   │   ├── layout/
│   │   ├── common/
│   │   └── ...
│   ├── hooks/              # Custom hooks
│   ├── services/           # Serviços de API
│   ├── store/              # Zustand stores
│   ├── types/              # Tipos TypeScript
│   ├── utils/              # Funções utilitárias
│   ├── layouts/            # Layouts
│   └── App.tsx
├── package.json
└── vite.config.ts
```

---

## 🐛 Reportando Bugs

Abra uma issue com:

1. **Descrição clara** do problema
2. **Passos para reproduzir**
3. **Comportamento esperado** vs **comportamento atual**
4. **Screenshots/logs** (se relevante)
5. **Versão** do projeto e ambiente

---

## 🚀 Sugestões de Novas Funcionalidades

Abra uma issue com:

1. **Descrição** da funcionalidade
2. **Casos de uso**
3. **Benefícios**
4. **Possível implementação** (opcional)

---

## 📞 Precisa de Ajuda?

- 📖 Leia o [README.md](README.md)
- 📚 Leia os READMEs do [backend](backend/README.md) e [frontend](frontend/README.md)
- 💬 Abra uma discussion no GitHub
- 📧 Entre em contato com os mantenedores

---

## 📜 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a licença do projeto (MIT).

**Obrigado por contribuir! 🎉**

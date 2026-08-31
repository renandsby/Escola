# Teste Suite - Sistema de Gestão Escolar

Documentação completa sobre como executar, escrever e manter testes.

## 📋 Visão Geral

A suite de testes cobre:
- ✅ **Backend**: Unit tests, Integration tests, API tests (Pytest)
- ✅ **Frontend**: Component tests, Hook tests, Utility tests (Vitest)
- ✅ **E2E**: Testes de fluxo completo (Playwright)

**Meta**: 80%+ cobertura

---

## 🚀 Testes Backend (Django + Pytest)

### Setup

```bash
cd backend
pip install -e ".[dev]"
pytest
```

### Executar Testes via Docker (Recomendado)

```bash
# Opção 1: Script automatizado
chmod +x backend/run_tests.sh
./backend/run_tests.sh

# Opção 2: Profile docker-compose de teste
docker-compose run --rm backend-test

# Opção 3: Execução direta no container backend em execução
docker-compose exec backend pytest --cov=apps --cov-report=html --cov-report=term-missing
```

### Executar Testes Localmente

```bash
# Todos os testes
pytest

# Com cobertura
pytest --cov=apps --cov-report=html

# Teste específico
pytest tests/test_models.py

# Teste específico dentro de uma classe
pytest tests/test_models.py::TestStudentModel::test_create_student

# Apenas testes rápidos
pytest -m "not slow"

# Modo verbose
pytest -v

# Com output detalhado
pytest -vv
```

### Estrutura de Testes Backend

```
backend/tests/
├── __init__.py
├── conftest.py          # Fixtures e configuração
├── factories.py         # Factory Boy factories
├── test_models.py       # Unit tests dos models
├── test_apis.py         # Integration tests das APIs
└── test_serializers.py  # Unit tests dos serializers
```

### Fixtures Disponíveis

```python
# Autenticação
user, authenticated_client, admin_user, admin_client

# Escola
school, user_with_school, authenticated_school_client

# Modelos
teacher, student, guardian, subject, classroom, class_obj
enrollment, grade, attendance
```

### Exemplo de Teste

```python
@pytest.mark.django_db
def test_create_student(student):
    """Teste criação de aluno."""
    assert student.user.role == 'student'
    assert student.registration_number is not None
    assert student.is_active is True
```

### Factories Disponíveis

```python
from tests.factories import (
    SchoolFactory, UserFactory, StudentFactory, TeacherFactory,
    SubjectFactory, ClassFactory, EnrollmentFactory, GradeFactory
)

# Uso
school = SchoolFactory(name='Minha Escola')
student = StudentFactory(school=school)
grade = GradeFactory(student=student.user, school=school)
```

---

## 🎨 Testes Frontend (React + Vitest)

### Setup

```bash
cd frontend
npm install
npm run test
```

### Executar Testes

```bash
# Todos os testes
npm run test

# Mode watch (reexecuta ao salvar)
npm run test -- --watch

# Com cobertura
npm run test:coverage

# Teste específico
npm run test -- useCrud.test.ts

# Modo ui (visual)
npm run test -- --ui
```

### Estrutura de Testes Frontend

```
frontend/src/
├── test/
│   └── setup.ts           # Configuração global
├── hooks/
│   └── __tests__/
│       └── useCrud.test.ts
├── components/
│   └── ui/
│       └── __tests__/
│           └── button.test.tsx
├── utils/
│   └── __tests__/
│       └── cn.test.ts
└── pages/
    └── __tests__/
        └── pages.test.tsx
```

### Exemplo de Teste de Hook

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useCrud } from '@/hooks/useCrud'

describe('useCrud', () => {
  it('should fetch list of items', async () => {
    const { result } = renderHook(() => useCrud('items'))
    
    await waitFor(() => {
      expect(result.current.list.isLoading).toBe(false)
    })
    
    expect(result.current.list.data).toBeDefined()
  })
})
```

### Exemplo de Teste de Componente

```typescript
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

---

## 🎭 Testes E2E (Playwright)

### Setup

```bash
cd frontend
npm install
npx playwright install

# Ou automático ao instalar
npm run test:e2e
```

### Executar Testes E2E

```bash
# Todos os testes
npm run test:e2e

# Modo UI (visual debugging)
npm run test:e2e:ui

# Teste específico
npx playwright test auth.spec.ts

# Debug
npx playwright test --debug

# Modo headed (visível)
npx playwright test --headed
```

### Estrutura de Testes E2E

```
frontend/e2e/
├── auth.spec.ts      # Login, autenticação
├── crud.spec.ts      # CRUD operations
└── workflows.spec.ts # User workflows
```

### Exemplo de Teste E2E

```typescript
import { test, expect } from '@playwright/test'

test('should login successfully', async ({ page }) => {
  await page.goto('/login')
  
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/dashboard')
})
```

### Seletores Recomendados

```typescript
// Melhor (specifico)
page.click('button[type="submit"]')
page.fill('input[name="email"]', 'test@example.com')

// Bom (texto)
page.click('text=Login')

// Evitar (CSS genérico)
page.click('.btn')
page.click('[class*="button"]')
```

---

## 📊 Cobertura

### Verificação Rápida

```bash
# Ambos (backend + frontend)
./scripts/check_coverage.sh

# Backend apenas (via Docker)
./backend/run_tests.sh

# Frontend apenas
cd frontend && npm run test:coverage
```

### Backend

```bash
pytest --cov=apps --cov-report=html
# Relatório em: htmlcov/index.html
```

### Frontend

```bash
cd frontend
npm run test:coverage
# Relatório em: frontend/coverage/index.html
```

Cobertura atual:
- Utils: 99.7%
- Components UI: 80.9%
- Services/Stores: 80%+

Meta Fase 1: 50%+ geral
Meta Final (Fase 2): 80%+ backend, 70%+ frontend

---

## 🔧 Troubleshooting

### Backend

**Erro: "No such table"**
```bash
pytest --create-db
# ou
python manage.py migrate --run-syncdb
```

**Erro: "Module not found"**
```bash
pip install -e ".[dev]"
```

**Conexão de banco de dados negada**
```bash
# Certifique-se que PostgreSQL está rodando
docker-compose up -d postgres
```

### Frontend

**Erro: "Cannot find module"**
```bash
npm install
npm run test -- --ui
```

**Teste não encontra elemento**
- Use `page.pause()` para debugar
- Use `--headed` no Playwright para ver navegador
- Verifique seletores com `await page.locator('selector').screenshot()`

### E2E

**Timeout ao conectar**
```bash
# Verifique se frontend está rodando
npm run dev

# Aguarde mais tempo
test.setTimeout(60000)
```

**Testes flaky (aleatoriamente falham)**
- Aumente timeout: `page.waitForURL('/path', { timeout: 5000 })`
- Use `waitFor()` em vez de `setTimeout()`
- Mock APIs lentas

---

## 📝 Writing Tests

### Backend - Boas Práticas

```python
# ✅ Bom
@pytest.mark.django_db
def test_student_has_registration_number(student):
    """Test que aluno tem matrícula."""
    assert student.registration_number is not None

# ❌ Ruim
def test_student():
    """Test."""
    pass

# ✅ Organize por classes
@pytest.mark.django_db
class TestStudentModel:
    def test_creation(self, student): ...
    def test_relationships(self, student): ...
    def test_methods(self, student): ...
```

### Frontend - Boas Práticas

```typescript
// ✅ Bom
describe('Button Component', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})

// ❌ Ruim - Muito genérico
it('renders', () => {
  render(<Button />)
})

// ✅ Mock corretamente
vi.mock('@/api', () => ({
  apiGet: vi.fn(() => Promise.resolve({ data: [] }))
}))
```

### E2E - Boas Práticas

```typescript
// ✅ Bom - User perspective
await page.fill('input[type="text"]', 'admin')
await page.click('text=Login')
await expect(page).toHaveURL('/dashboard')

// ❌ Ruim - Implementation details
await page.evaluate(() => localStorage.setItem('token', '...'))

// ✅ Wait corretamente
await page.waitForURL('/dashboard', { timeout: 5000 })
await page.waitForSelector('[data-loaded="true"]')

// ❌ Ruim
await page.wait(1000)
```

---

## 🚀 CI/CD

### GitHub Actions

Testes rodam automaticamente em:
- **Backend**: Toda commit em `backend/`
- **Frontend**: Toda commit em `frontend/`
- **E2E**: PRs e antes de merge

Logs: https://github.com/projeto/actions

---

## 📚 Recursos

- [Pytest Docs](https://docs.pytest.org/)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Factory Boy Docs](https://factoryboy.readthedocs.io/)

---

*Última atualização: 2026-07-09*

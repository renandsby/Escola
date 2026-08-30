# 🎓 Sistema de Gestão Escolar Municipal (SGE)

> Plataforma web para a Secretaria Municipal de Educação (SME) gerir a rede pública de ensino: cadastro único de alunos, escolas, turmas, diário de classe (notas, frequência e pareceres), matrículas/transferências, matriz curricular e relatórios oficiais. Voltado a redes municipais brasileiras .

---

## 📌 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura & Estrutura de Pastas](#-arquitetura--estrutura-de-pastas)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação e Execução](#-instalação-e-execução)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Testes e Qualidade](#-testes-e-qualidade)
- [Documentação da API / Endpoints](#-documentação-da-api--endpoints)
- [Como Contribuir](#-como-contribuir)
- [Licença](#-licença)
- [Autores & Contato](#-autores--contato)

---



## 📖 Sobre o Projeto

O SGE modela a hierarquia real de uma rede municipal de educação: a **Secretaria Municipal (SME)** no topo, suas **escolas**, e dentro de cada escola as **turmas**, **matrículas** e o **diário de classe**. O controle de acesso é hierárquico (RBAC por escopo) — cada papel só enxerga o que lhe compete:


| Papel                                  | Escopo de visão                      |
| -------------------------------------- | ------------------------------------ |
| `sme_admin` / `sme_supervisor`         | Toda a rede municipal                |
| `school_director` / `school_secretary` | A própria unidade escolar            |
| `teacher`                              | Apenas as turmas em que está alocado |
| `student_guardian`                     | Apenas o(s) aluno(s) vinculado(s)    |


O backend segue o padrão **Services & Selectors** (regras de negócio isoladas em *services*, leitura com escopo em *selectors*, *views* finas) e o frontend uma arquitetura **Feature-Sliced** (`src/features/<domínio>/`). Toda a documentação de arquitetura obrigatória está em [`.docs/`](.docs/).

### ✨ Funcionalidades Principais

- [x] **Autenticação JWT** com *refresh token* rotativo, mutex de renovação e logout em cascata
- [x] **RBAC hierárquico por escopo** (SME → escola → professor → responsável), centralizado em `core/scopes.py`
- [x] **Cadastro único de aluno** e gestão de **matrículas** com regras de negócio: bloqueio de matrícula ativa duplicada no ano letivo e verificação de **capacidade da turma** (`select_for_update` sob transação)
- [x] **Transferências** entre escolas: solicitação + autorização (SME) → aceite/recusa (escola de destino), com **efeito real na matrícula** (encerra origem, cria destino, atômico)
- [x] **Alocação docente** com prevenção de **conflito de turno** no mesmo ano letivo
- [x] **CRUD de turmas e salas** na interface, com escopo por escola
- [x] **Diário de classe**: lançamento **em lote** de notas e frequência (`bulk_create` / `bulk_update`), pareceres descritivos para a Educação Infantil
- [x] **Fechamento de ano letivo**: consolidação de `SchoolHistory` (aprovado / reprovado por nota / por frequência) e trava do diário
- [x] **Matriz curricular** por etapa de ensino (BNCC) e catálogo de disciplinas da rede
- [x] **Relatórios**: boletim/carteirinha em PDF (QR Code), Excel/CSV, e **Educacenso** com validação de consistência + arquivo ZIP por entidade
- [x] **Portal do responsável** ("Meus filhos") — média, frequência e boletim de cada dependente
- [x] **LGPD**: registro de consentimento, portabilidade (exportação do titular) e anonimização
- [x] **Documentos**: upload validado (extensão, *magic bytes*, 15 MB) com isolamento RBAC
- [x] **Notificações in-app** com gatilhos de negócio (transferência, mensagem)
- [x] **Trilha de auditoria** persistida pelo `AuditMiddleware` (escritas `/api/` + login/login falho)
- [x] **Backup** automatizado do banco (task Celery noturna + retenção de 30 dias)
- [x] **Hardening de produção**: `docker-compose.prod.yml`, nginx/TLS, settings que recusam boot inseguro em `ENVIRONMENT=production`
- [x] **Recuperação de senha** por e-mail (token de 2 h, uso único)
- [x] **Painel gerencial** com KPIs, gráficos e completude do diário, filtrados pelo papel
- [x] **Carga inicial** do Censo Escolar 2025 do INEP + carga fictícia completa (`seed_dashboard_demo`)
- [x] **Documentação OpenAPI** gerada automaticamente (Swagger / ReDoc)
- [ ] Notificações por e-mail/WhatsApp · autenticação em dois fatores (2FA) · homologação do selo INEP/MEC



### 🧩 Domínios de negócio

`authentication` (API sobre `core.User`) · `governance` (SME, ano letivo, etapas, **LGPD**, **fechamento de ano**) · `schools` · `curriculum` (disciplinas, matrizes) · `classes` (turmas, salas, docência) · `students` (alunos, responsáveis, matrículas, transferências, **portal da família**) · `class_diary` (notas, frequência, pareceres, **consolidação de histórico**) · `reports` (boletim/carteirinha, Excel/CSV, **Educacenso**) · `dashboard` (agregações da rede)

Apps de infraestrutura: `health`, `audit` (`AuditLog` via middleware), `backups` (pg_dump agendado), `notifications` (in-app + gatilhos), `communications`, `documents` (upload validado), `student_cards`, `integrations`.

---



## 🛠 Tecnologias Utilizadas

**Backend**

- **Linguagem:** Python ≥ 3.13
- **Framework:** Django 6.1 + Django REST Framework 3.18
- **API tooling:** drf-spectacular (OpenAPI), djangorestframework-simplejwt (JWT), django-filter
- **Banco de Dados:** PostgreSQL 16 (`psycopg` 3)
- **Cache / Fila:** Redis 8 + Celery 5.6 (`django-redis`)
- **Servidor:** Gunicorn + WhiteNoise
- **Outros:** reportlab / openpyxl / python-docx (relatórios), segno·qrcode (QR Code), boto3 / django-storages (S3), cryptography, twilio

**Frontend**

- **Linguagem:** TypeScript 5 (*strict mode*)
- **Framework:** React 18 + Vite 5
- **Server state:** TanStack Query v5 · **Client state:** Zustand
- **Formulários:** React Hook Form + Zod
- **UI:** Tailwind CSS 3 + `class-variance-authority` + `lucide-react` · `sonner` (toasts) · `recharts`
- **HTTP:** Axios (interceptors de token/refresh)

**DevOps & Qualidade**

- **Containerização:** Docker & Docker Compose (Nginx para o frontend)
- **CI/CD:** GitHub Actions — `backend-ci.yml`, `frontend-ci.yml`, `main.yml`
- **Backend:** pytest + pytest-django (~290 testes), factory-boy, coverage · black · ruff · mypy (django-stubs / drf-stubs)
- **Frontend:** Vitest + Testing Library · Playwright (e2e) · ESLint · Prettier

---



## 📂 Arquitetura & Estrutura de Pastas

```text
Escola/
├── backend/
│   ├── apps/
│   │   ├── governance/            # Domínio: SME, ano letivo, etapas de ensino
│   │   │   ├── models/            #   modelos (um arquivo por entidade)
│   │   │   ├── selectors/         #   leitura com escopo RBAC (apply_scope)
│   │   │   ├── services/          #   regras de negócio / mutações
│   │   │   ├── api/               #   serializers · views (finas) · urls
│   │   │   ├── management/commands/#  seed_censo_igarassu, seed_municipal
│   │   │   ├── data/              #   recorte do Censo INEP (Igarassu)
│   │   │   └── tests/             #   factories · test_selectors · test_apis · test_privacy · test_year_closing
│   │   ├── authentication/        # (mesmo layout) — API sobre core.User + reset de senha
│   │   ├── schools/  curriculum/  classes/  students/  class_diary/  reports/
│   │   ├── dashboard/  (seed_dashboard_demo — carga fictícia completa)
│   │   ├── audit/ backups/ notifications/ communications/ documents/ student_cards/ …   # satélites
│   │   └── health/
│   ├── config/                   # settings.py · urls.py (contrato de URL) · celery.py
│   ├── core/                     # User, BaseModel, permissions, scopes (RBAC), exceptions
│   ├── common/                   # utilitários compartilhados (logging, middleware)
│   ├── tests/                    # testes transversais (conftest, factories, integração)
│   ├── pyproject.toml  ·  pytest.ini  ·  Dockerfile
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── providers/        # AppProviders (QueryClient, Toaster)
│       │   └── routes/           # AppRoutes · ProtectedRoute (guarda RBAC)
│       ├── features/<domínio>/   # authentication · governance · schools · curriculum · classes · students · guardians · class-diary · reports · dashboard · notifications
│       │   ├── api/              #   funções de requisição da feature
│       │   ├── hooks/            #   hooks de TanStack Query
│       │   ├── schemas/          #   schemas Zod dos formulários
│       │   └── pages/            #   páginas roteáveis
│       ├── components/{ui,layout,feedback}/
│       ├── pages/                # páginas de apps satélite (dashboard, messages, documents, settings)
│       ├── services/api.ts       # cliente Axios + interceptors (refresh token)
│       ├── stores/authStore.ts   # Zustand (accessToken, refreshToken, user, isHydrated)
│       └── types/                # tipos globais da API
│
├── .docs/                        # documentação de arquitetura (padrão oficial do projeto)
├── censo_2025/                   # microdados brutos do Censo INEP (git-ignored, ~500 MB)
├── docker-compose.yml
├── .env.example
└── README.md
```

---



## ⚙️ Pré-requisitos

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) (fluxo recomendado)
- Para rodar **sem Docker**: Python **≥ 3.13**, Node.js **≥ 20**, PostgreSQL 16 e Redis 8

---



## 🚀 Instalação e Execução



### 1. Clonar o repositório

```bash
git clone git@github.com:renandsby/Escola.git
cd Escola
```



### 2. Configurar o ambiente

```bash
cp .env.example .env
# ajuste SECRET_KEY / JWT_SECRET_KEY antes de qualquer uso não-local
```



### 3. Subir o ambiente com Docker

```bash
docker compose up -d --build
```

> As imagens base vêm do Docker Hub. Se a build falhar por timeout de DNS (comum no WSL2), e as imagens já existirem localmente, use apenas `docker compose up -d`.



### 4. Executar migrações e carga inicial

```bash
# migrações
docker compose exec backend python manage.py migrate

# 1) base estrutural a partir do Censo Escolar 2025 (rede de Igarassu/PE):
#    SME, ano letivo, etapas, disciplinas, matrizes, 49 escolas, ~322 salas,
#    ~535 turmas e os usuários admin/supervisor
docker compose exec backend python manage.py seed_censo_igarassu

# 2) carga fictícia completa (alunos, matrículas, notas, frequência, pareceres,
#    responsáveis com login, consentimentos LGPD, documentos, notificações,
#    transferências e o ano letivo anterior já encerrado):
docker compose exec backend python manage.py seed_dashboard_demo --fresh
#    -> cria também o login "responsavel" / "resp123" (portal da família)

# alternativa menor e autocontida (rede de exemplo "São Paulo", usuários ".sp"):
#    docker compose exec backend python manage.py seed_municipal

# (alternativa) superusuário manual
docker compose exec backend python manage.py createsuperuser
```



### 5. Acessar


| Recurso                       | URL                                                                | Credenciais (seed)   |
| ----------------------------- | ------------------------------------------------------------------ | -------------------- |
| Frontend (SPA)                | [http://localhost:3000](http://localhost:3000)                     | `admin` / `admin123` |
| API REST                      | [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)     | —                    |
| Documentação da API (Swagger) | [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/) | —                    |
| Django Admin                  | [http://localhost:8000/admin/](http://localhost:8000/admin/)       | `admin` / `admin123` |


> O container do frontend serve um build estático. Após alterar o código do frontend, rode `docker compose build frontend && docker compose up -d frontend` para ver as mudanças.

---



## 🔐 Variáveis de Ambiente

Principais variáveis do `.env` (ver `.env.example` para a lista completa — e-mail, S3, Twilio, Sentry):


| Variável                              | Descrição                          | Valor Padrão / Exemplo                          |
| ------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| `DEBUG`                               | Modo de depuração do Django        | `True`                                          |
| `SECRET_KEY`                          | Chave secreta do Django            | *(troque em produção)*                          |
| `ALLOWED_HOSTS`                       | Hosts permitidos (CSV)             | `localhost,127.0.0.1,0.0.0.0`                   |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Credenciais do PostgreSQL          | `escola_db` / `escola_user` / `escola_password` |
| `DB_HOST` / `DB_PORT`                 | Host e porta do banco              | `postgres` / `5432`                             |
| `REDIS_URL`                           | URL do Redis (cache/broker Celery) | `redis://redis:6379/0`                          |
| `JWT_SECRET_KEY`                      | Chave de assinatura dos tokens JWT | *(troque em produção)*                          |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`     | Expiração do *access token*        | `30`                                            |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS`       | Expiração do *refresh token*       | `7`                                             |
| `CORS_ALLOWED_ORIGINS`                | Origens liberadas para CORS (CSV)  | `http://localhost:3000,...`                     |
| `VITE_API_URL`                        | Base da API para o frontend        | `http://localhost:8000`                         |


---



## 🧪 Testes e Qualidade

**Backend** (dentro do container):

```bash
docker compose exec backend python -m pytest -q --no-cov     # suíte completa (186 testes)
docker compose exec backend python -m pytest --cov=apps      # com cobertura
docker compose exec backend python manage.py check           # checagem do projeto
```

Ferramentas de dev (`black`, `ruff`, `mypy`) estão em `pyproject.toml` (`optional-dependencies.dev`).

**Frontend** (o container é apenas Nginx — rode localmente em `frontend/`):

```bash
npm ci
npm run test            # Vitest
npm run type-check      # tsc --noEmit
npm run lint            # ESLint
npm run build           # tsc -b && vite build
npm run test:e2e        # Playwright
```

O pipeline do GitHub Actions (`.github/workflows/`) executa lint, testes e build para backend e frontend a cada push, com serviços de PostgreSQL e Redis.

---



## 📡 Documentação da API / Endpoints

Toda a API vive sob o prefixo `/api/v1/`. O schema OpenAPI é gerado por `drf-spectacular`:

- **Swagger UI:** [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **ReDoc:** [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)
- **Schema (YAML):** [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)


| Método       | Rota                                 | Descrição                                    | Autenticação          |
| ------------ | ------------------------------------ | -------------------------------------------- | --------------------- |
| `POST`       | `/api/v1/accounts/login/`            | Autentica e retorna `access` + `refresh`     | Não                   |
| `POST`       | `/api/v1/accounts/token/refresh/`    | Renova o *access token*                      | Não (envia `refresh`) |
| `POST`       | `/api/v1/accounts/password-reset/request/` | Recuperação de senha (sucesso genérico) | Não                   |
| `GET`        | `/api/v1/accounts/users/me/`         | Perfil do usuário autenticado                | Bearer                |
| `POST`       | `/api/v1/accounts/users/create_user/`| SME cria usuário da rede com papel           | Bearer (`sme_admin`)  |
| `GET`        | `/api/v1/dashboard/overview/`        | KPIs, gráficos e completude do diário        | Bearer                |
| `GET` `POST` | `/api/v1/schools/`                   | Lista / cadastra escolas (escopo RBAC)       | Bearer                |
| `GET` `POST` | `/api/v1/classes/` · `/classrooms/`  | Turmas e salas (escopo por escola)           | Bearer                |
| `GET` `POST` | `/api/v1/students/`                  | Alunos (cadastro único)                      | Bearer                |
| `POST`       | `/api/v1/enrollments/`               | Matricula aluno em turma (regras de negócio) | Bearer                |
| `POST`       | `/api/v1/grades/batch-upsert/`       | Lançamento de notas em lote                  | Bearer                |
| `POST`       | `/api/v1/attendance/batch-upsert/`   | Lançamento de frequência em lote             | Bearer                |
| `PATCH`      | `/api/v1/sme/transfers/{id}/accept/` | Aceite da transferência (efeito na matrícula)| Bearer                |
| `POST`       | `/api/v1/sme/academic-years/{id}/close/` | Fecha o ano + consolida histórico       | Bearer (`sme_admin`)  |
| `GET`        | `/api/v1/guardians/my-dependents/`   | Portal da família — resumo por filho         | Bearer                |
| `GET` `POST` | `/api/v1/privacy/consents/` · `my-data/` | Consentimento / portabilidade LGPD      | Bearer                |
| `GET` `POST` | `/api/v1/documents/`                 | Upload validado de documentos (multipart)    | Bearer                |
| `GET`        | `/api/v1/notifications/unread_count/`| Contador do sino                             | Bearer                |
| `GET`        | `/api/v1/reports/boletim_pdf/?student_id=` | Boletim do aluno em PDF                 | Bearer                |
| `GET`        | `/api/v1/reports/educacenso/validate/` · `/export/` | Diagnóstico + ZIP do Educacenso | Bearer (`sme_supervisor`+) |
| `GET`        | `/health/live/` · `/health/ready/`   | *Health checks* (liveness / readiness)       | Não                   |


O **contrato de URL é estável**: consolidações de apps não alteram os prefixos existentes.

---



## 🤝 Como Contribuir

1. Faça um *fork* do projeto.
2. Crie uma branch a partir de `main`:
  ```bash
   git checkout -b feature/minha-feature
  ```
3. Siga os padrões de arquitetura em `[.docs/](.docs/)` (Services & Selectors no backend, Feature-Sliced no frontend) e commite no padrão [Conventional Commits](https://www.conventionalcommits.org/):
  ```bash
   git commit -m 'feat: adiciona validação de conflito de agenda docente'
  ```
4. Garanta que a suíte passa (`pytest`, `npm run type-check`, `npm run lint`, `npm run build`).
5. Envie a branch e abra um **Pull Request**.

Consulte também `CONTRIBUTING.md` e `TESTING.md`.

---



## 📄 Licença

Distribuído sob a licença **MIT** (declarada em `backend/pyproject.toml`).

---



## 👥 Autores & Contato

- **Sergio Henrique** — [`sergio.hss@hotmail.com`](mailto:sergio.hss@hotmail.com) · [LinkedIn](https://www.linkedin.com/in/sergiohss/)
- **Renan Diego** — [`renandsb@gmail.com`](mailto:renandsb@gmail.com) · [LinkedIn](https://www.linkedin.com/in/renandiego022/)

Repositório: <https://github.com/renandsby/Escola>


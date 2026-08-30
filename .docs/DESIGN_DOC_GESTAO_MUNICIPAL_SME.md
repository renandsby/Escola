# RFC / Design Doc: Arquitetura do Sistema de Gestão da Rede Municipal de Ensino (SME)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | **Implementado** — em uso pela rede municipal de Igarassu/PE |
| **Autor** | Equipe de Arquitetura & Engenharia de Software |
| **Versão** | 3.0.0 |
| **Data** | Agosto de 2026 |
| **Domínio** | Gestão Pública Municipal / Educação Básica |
| **Documentos correlatos** | [`ARCHITECTURE_BACKEND_DJANGO.md`](ARCHITECTURE_BACKEND_DJANGO.md) · [`ARCHITECTURE_FRONTEND_REACT.md`](ARCHITECTURE_FRONTEND_REACT.md) · [`../README.md`](../README.md) · [`../tutoriais/`](../tutoriais/) |

---

## 1. Contexto e Justificativa de Negócio

### 1.1. Contexto Atual
O sistema escolar original foi concebido com uma modelagem centrada em unidades escolares isoladas (*mono-unidade*), com entidades básicas (`School`, `Student`, `Class`, `Subject`, `Grade`, `Attendance`, `Enrollment`).

### 1.2. Problema
Ao expandir a atuação para atender a **Secretaria Municipal de Educação (SME)**, o modelo isolado gera fragmentação, redundância e inconsistência de dados:
* **Duplicidade Cadastral de Estudantes:** Transferências entre escolas municipais geram cadastros duplicados e perda do histórico acadêmico unificado.
* **Descentralização Curricular:** Falta de padronização de Matrizes Curriculares (BNCC) e nomenclaturas de componentes curriculares.
* **Gestão Docente Fragmentada:** Professores do quadro municipal que lecionam em múltiplas escolas não possuem visão unificada de sua carga horária e diários de classe.
* **Falta de Suporte a Diferentes Modalidades:** A Educação Infantil e o Atendimento Educacional Especializado (AEE) exigem avaliação por **Pareceres Descritivos** e relatórios de desenvolvimento, incompatíveis com o modelo puramente quantitativo de notas (`Grade`).
* **Conformidade Legal:** Dificuldade na geração padronizada de arquivos do **Educacenso (INEP/MEC)**.

### 1.3. Estado da Implementação (v3.0)

A arquitetura-alvo descrita neste documento foi **implementada**. Situação atual:

* **Backend consolidado em 8 domínios** (padrão *Services & Selectors*): `authentication`, `governance`, `schools`, `curriculum`, `classes`, `students`, `class_diary`, `reports` — mais apps de infraestrutura (`health`, `audit`, `backups`, `integrations`, `notifications`, `communications`, `dashboard`, `documents`, `student_cards`).
* **Frontend reestruturado** em arquitetura *Feature-Sliced* (`src/features/<domínio>/`, `src/app/`).
* **Regras de negócio implementadas e testadas:** cadastro único, matrícula ativa duplicada, capacidade de turma, conflito de agenda docente, fluxo de transferência, lançamento em lote de notas/frequência (ver §7).
* **Carga inicial** da rede a partir dos dados públicos do **Censo Escolar 2025 do INEP** (ver §9).
* **Contrato de URL congelado:** a consolidação de apps não alterou os prefixos da API.
* Cobertura de testes de backend: ~290 casos (pytest).

**Produção mínima (plano `PLANO_EXECUCAO_PRODUCAO_MINIMA`) — concluída.** As ondas P1 e P2 foram implementadas:

* **P1 — prontidão de produção:** hardening de configuração/deploy (settings guardados por `ENVIRONMENT=production`, `docker-compose.prod.yml`, nginx/TLS, job de CI `deploy-check`); backup automatizado do banco (task Celery noturna + retenção); trilha de auditoria persistida no middleware (escritas `/api/` + login/login falho); transferência com efeito real na matrícula (encerra origem, cria destino, atômico).
* **P2 — operação completa:** módulo mínimo de LGPD (consentimento, portabilidade, anonimização); recuperação de senha e perfil real; upload seguro de documentos com isolamento RBAC; CRUD de turmas e salas na interface; gestão administrativa de usuários da rede; central de exportações e emissão de boletim/carteirinha; motor de validação e exportação do Educacenso; portal do responsável ("Meus Filhos"); notificações in-app com gatilhos de negócio; fechamento de ano letivo com consolidação de histórico e trava do diário.

**Fora de escopo (non-goals do plano):** Merenda/PNAE, Transporte/Frotas, Financeiro/Folha, app mobile nativo, 2FA/MFA TOTP, homologação do selo INEP/MEC.

---

## 2. Objetivos de Engenharia (Goals & Non-Goals)

### 2.1. Goals (Objetivos)
1. **Centralização Hierárquica (Top-Down):** A Secretaria Municipal de Educação como entidade raiz.
2. **Cadastro Único do Aluno:** Chave persistente em toda a trajetória escolar no município.
3. **Multi-Alocação Docente:** O professor pertence ao quadro municipal e atua em turmas de diferentes escolas.
4. **Duplo Modelo Avaliativo:** Avaliação quantitativa (notas) e qualitativa (pareceres descritivos da Educação Infantil).
5. **RBAC Hierárquico Multi-Nível:** Permissões com isolamento de escopo por nível de atuação (SME, Direção, Docente, Aluno/Responsável).

### 2.2. Non-Goals (Fora de Escopo)
* Gestão de redes estaduais ou federais (escopo estritamente municipal).
* Aplicativo mobile nativo (foco em Web Responsiva).
* Módulo financeiro de folha de pagamento de servidores (integração via APIs externas).

---

## 3. Arquitetura de Software

### 3.1. Stack tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Backend** | Python ≥ 3.13 · Django 6.1 · Django REST Framework 3.18 · drf-spectacular (OpenAPI) · djangorestframework-simplejwt (JWT) · django-filter |
| **Banco / Cache / Fila** | PostgreSQL 16 (`psycopg` 3) · Redis 8 · Celery 5.6 |
| **Frontend** | React 18 + TypeScript 5 (strict) · Vite 5 · TanStack Query v5 (server state) · Zustand (client state) · React Hook Form + Zod · Tailwind CSS 3 · sonner |
| **Infra** | Docker Compose (Nginx no frontend, Gunicorn + WhiteNoise no backend) · GitHub Actions |
| **Qualidade** | pytest + pytest-django · factory-boy · black · ruff · mypy · Vitest · Playwright · ESLint |

### 3.2. Backend — padrão *Services & Selectors* por domínio

Cada app de domínio segue o mesmo layout (detalhado em [`ARCHITECTURE_BACKEND_DJANGO.md`](ARCHITECTURE_BACKEND_DJANGO.md)):

```text
apps/<domínio>/
├── models/          # entidades (um arquivo por modelo)
├── selectors/       # leitura com escopo RBAC — chamam core.scopes.apply_scope()
├── services/        # regras de negócio / mutações (transações, validações)
├── api/             # serializers · views finas (delegam a services/selectors) · urls
├── management/      # comandos (seed)
└── tests/           # factories · test_selectors · test_services · test_apis
```

O escopo por papel é centralizado em **`core/scopes.py`** (`apply_scope`), e o
modelo de usuário (`core.User`) permanece em **`core/`** — o app
`authentication` é apenas a camada de API (login/JWT/perfil) em torno dele.

### 3.3. Frontend — arquitetura *Feature-Sliced*

```text
frontend/src/
├── app/
│   ├── providers/       # AppProviders (QueryClient, Toaster)
│   └── routes/          # AppRoutes · ProtectedRoute (guarda RBAC, aguarda hidratação)
├── features/<domínio>/  # api/ · hooks/ (TanStack Query) · schemas/ (Zod) · pages/
├── components/{ui,layout,feedback}/
├── services/api.ts      # Axios + interceptors (injeção de token, refresh com mutex)
├── stores/authStore.ts  # Zustand (accessToken, refreshToken, user, isHydrated)
└── types/
```

---

## 4. Arquitetura de Domínio & Bounded Contexts (DDD)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   SECRETARIA MUNICIPAL DE EDUCAÇÃO                      │
│                        (EducationDepartment)                            │
└──────────────┬────────────────────────────┬────────────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────────┐ ┌───────────────────────────────────────┐
│  Governança (governance)     │ │  Institucional (schools / classes)    │
│ - AcademicYear               │ │ - School (Unidades Escolares)          │
│ - AcademicPeriod             │ │ - Classroom (Salas de Aula)           │
│ - EducationStage             │ │ - TeacherProfile (Quadro Municipal)    │
│ Currículo (curriculum)       │ │ - TeacherAllocation                    │
│ - CurriculumMatrix & Item    │ │ Alunos (students)                      │
│ - Subject (Base Municipal)   │ │ - TransferRequest (Central de Vagas)   │
└──────────────┬───────────────┘ └───────────────────┬───────────────────┘
               │                                     │
               └──────────────────┬──────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Contexto Escolar & Operacional (students / classes)   │
│ - SchoolClass (Turma)  ·  TeacherAllocation (Alocação Docente)          │
│ - Student (Cadastro Único) · Guardian · StudentGuardian                 │
│ - Enrollment (Matrícula Anual na Turma)                                 │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                Contexto do Diário de Classe (class_diary)               │
│ - Grade (Notas Quantitativas)  ·  DescriptiveEvaluation (Pareceres)     │
│ - Attendance (Frequência)  ·  DiaryEntry (Conteúdo Ministrado)          │
│ - SchoolHistory (Consolidação de Desempenho)                            │
└────────────────────────────────────────────────────────────────────────┘

Relatórios (reports): Boletim PDF · Carteirinha (QR Code) · Excel/CSV · Educacenso
```

---

## 5. Dicionário de Dados e Especificação de Entidades

> **Convenções gerais.** Todas as entidades herdam de `BaseModel`
> (`id UUID` PK, `created_at`, `updated_at`, `is_active BOOLEAN DEFAULT TRUE`).
> Entidades marcadas com **(soft-delete)** herdam de `SoftDeleteModel`,
> que adiciona `deleted_at TIMESTAMPTZ NULL` — a exclusão via API **desativa**
> o registro (`deleted_at` preenchido), não o remove.

### 5.1. Identidade e Acesso

#### 5.1.1. `core.User` (Usuário)
Modelo de autenticação (permanece em `core/`; `AUTH_USER_MODEL`).

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    password VARCHAR(128) NOT NULL,
    first_name VARCHAR(150), last_name VARCHAR(150),
    phone VARCHAR(20),
    document VARCHAR(20) UNIQUE,            -- CPF/CNPJ
    role VARCHAR(30) NOT NULL DEFAULT 'student_guardian',
    -- 'sme_admin','sme_supervisor','school_director','school_secretary','teacher','student_guardian'
    education_department_id UUID REFERENCES education_departments(id) ON DELETE RESTRICT,
    school_id UUID REFERENCES schools(id) ON DELETE RESTRICT,
    is_staff BOOLEAN DEFAULT FALSE, is_superuser BOOLEAN DEFAULT FALSE,
    last_login_ip INET, last_login_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2. Núcleo Institucional & Estrutura da Rede

#### 5.2.1. `EducationDepartment` (Secretaria Municipal de Educação)
Tenant raiz e entidade de governança educacional do município.

```sql
CREATE TABLE education_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_name VARCHAR(150) NOT NULL,
    ibge_code VARCHAR(7) NOT NULL UNIQUE,
    secretary_name VARCHAR(150),
    min_passing_grade NUMERIC(4,2) DEFAULT 6.00,
    min_attendance_percentage NUMERIC(5,2) DEFAULT 75.00,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5.2.2. `School` (Unidade Escolar) — (soft-delete)

```sql
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    inep_code VARCHAR(8) UNIQUE,
    name VARCHAR(200) NOT NULL,
    cnpj VARCHAR(14) UNIQUE,
    school_type VARCHAR(50) NOT NULL,   -- 'CRECHE','PRE_ESCOLA','FUNDAMENTAL_1','FUNDAMENTAL_2','EJA','MISTA'
    director_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(254), phone VARCHAR(20), website VARCHAR(200),
    address_street VARCHAR(255), address_number VARCHAR(20), address_neighborhood VARCHAR(100),
    address_city VARCHAR(100), address_state VARCHAR(2), address_zip_code VARCHAR(8),
    max_students_per_class INTEGER DEFAULT 30,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_schools_department ON schools(education_department_id);
```

#### 5.2.3. `Classroom` (Sala de Aula)

```sql
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    number VARCHAR(20) NOT NULL,
    capacity INTEGER NOT NULL,
    floor INTEGER NOT NULL,
    building VARCHAR(50),
    has_projector BOOLEAN DEFAULT FALSE, has_whiteboard BOOLEAN DEFAULT TRUE,
    has_blackboard BOOLEAN DEFAULT FALSE, has_air_conditioning BOOLEAN DEFAULT FALSE,
    has_wifi BOOLEAN DEFAULT FALSE,
    CONSTRAINT uq_classroom UNIQUE (school_id, number)
);
```

#### 5.2.4. `AcademicYear` e `AcademicPeriod`

```sql
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    year INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',   -- 'PLANNED','ACTIVE','CLOSED'
    start_date DATE NOT NULL, end_date DATE NOT NULL,
    CONSTRAINT uq_academic_year_dept UNIQUE (education_department_id, year)
);

CREATE TABLE academic_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,          -- '1º Bimestre', ...
    period_number INTEGER NOT NULL,
    start_date DATE NOT NULL, end_date DATE NOT NULL,
    grade_deadline DATE NOT NULL,
    CONSTRAINT uq_academic_period UNIQUE (academic_year_id, period_number)
);
```

### 5.3. Estrutura Curricular da Rede (Alinhamento BNCC)

```sql
CREATE TABLE education_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    stage_type VARCHAR(50) NOT NULL,       -- 'INFANTIL','FUNDAMENTAL_I','FUNDAMENTAL_II','EJA'
    evaluation_type VARCHAR(30) NOT NULL   -- 'NUMERIC','CONCEPT','DESCRIPTIVE'
);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    bncc_code VARCHAR(50),
    area_of_knowledge VARCHAR(100) NOT NULL,
    description TEXT,
    minimum_passing_grade NUMERIC(4,2) DEFAULT 6.00,
    CONSTRAINT uq_subject_dept_name UNIQUE (education_department_id, name)
);

CREATE TABLE curriculum_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    education_stage_id UUID NOT NULL REFERENCES education_stages(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL
);

CREATE TABLE curriculum_matrix_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_matrix_id UUID NOT NULL REFERENCES curriculum_matrices(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    weekly_hours INTEGER NOT NULL, annual_hours INTEGER NOT NULL,
    CONSTRAINT uq_matrix_subject UNIQUE (curriculum_matrix_id, subject_id)
);
```

### 5.4. Turmas, Servidores e Alocação Docente

#### 5.4.1. `SchoolClass` (Turma) — (soft-delete)

```sql
CREATE TABLE school_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    curriculum_matrix_id UUID NOT NULL REFERENCES curriculum_matrices(id) ON DELETE RESTRICT,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    name VARCHAR(50) NOT NULL,          -- '5º Ano A', 'Creche A'
    shift VARCHAR(20) NOT NULL,         -- 'MORNING','AFTERNOON','FULL_TIME','NIGHT'
    max_capacity INTEGER NOT NULL DEFAULT 30,
    room_number VARCHAR(20), inep_class_code VARCHAR(20),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_school_classes_lookup ON school_classes(school_id, academic_year_id);
```

#### 5.4.2. `TeacherProfile` (soft-delete) e `TeacherAllocation`

```sql
CREATE TABLE teacher_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    registration_number VARCHAR(50) NOT NULL UNIQUE,   -- matrícula funcional
    cpf VARCHAR(11) NOT NULL UNIQUE,
    formation_area VARCHAR(150),
    birth_date DATE, hiring_date DATE,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE teacher_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    school_class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,  -- NULL = regente / unidocente
    is_regent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_allocation UNIQUE (teacher_profile_id, school_class_id, subject_id)
);
```

> A criação de alocação passa pelo *service* `allocate_teacher()`, que impede
> **conflito de agenda** (turnos sobrepostos no mesmo ano letivo) além da
> unicidade — ver §7.3.

### 5.5. Alunos, Responsáveis, Matrículas e Fluxo Escolar

#### 5.5.1. `Student` (Cadastro Único Municipal) — (soft-delete)

```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,  -- login opcional do aluno
    unique_municipal_id VARCHAR(20) NOT NULL UNIQUE,
    inep_id VARCHAR(12) UNIQUE,
    full_name VARCHAR(200) NOT NULL, social_name VARCHAR(200),
    cpf VARCHAR(11) UNIQUE, birth_certificate VARCHAR(50),
    nis_code VARCHAR(15),
    birth_date DATE NOT NULL, gender VARCHAR(20), race_color VARCHAR(30),
    mother_name VARCHAR(200) NOT NULL, father_name VARCHAR(200),
    has_special_needs BOOLEAN DEFAULT FALSE, special_needs_details TEXT, notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5.5.2. `Guardian` (soft-delete) e `StudentGuardian`

```sql
CREATE TABLE guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(200) NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL, email VARCHAR(254),
    address VARCHAR(255), occupation VARCHAR(100),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE student_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    kinship_type VARCHAR(50) NOT NULL,     -- 'MOTHER','FATHER','LEGAL_GUARDIAN','GRANDPARENT','OTHER'
    is_emergency_contact BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_student_guardian UNIQUE (student_id, guardian_id)
);
```

#### 5.5.3. `Enrollment` (Matrícula) — (soft-delete)

```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    school_class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE RESTRICT,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE RESTRICT,  -- denormalizado
    enrollment_number VARCHAR(50) NOT NULL UNIQUE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ENROLLED',
    -- 'ENROLLED','APPROVED','FAILED_ACADEMIC','FAILED_ATTENDANCE',
    -- 'TRANSFERRED_INTERNAL','TRANSFERRED_EXTERNAL','DROPOUT','DECEASED'
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_enrollments_student_class ON enrollments(student_id, school_class_id);
-- só UMA matrícula ativa por aluno/ano letivo (índice único parcial):
CREATE UNIQUE INDEX uniq_active_enrollment_per_year
    ON enrollments (student_id, academic_year_id)
    WHERE status = 'ENROLLED' AND deleted_at IS NULL;
```

#### 5.5.4. `TransferRequest` (Central de Vagas) — (soft-delete)

```sql
CREATE TABLE transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    origin_school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    destination_school_id UUID REFERENCES schools(id) ON DELETE RESTRICT,  -- NULL = externa ao município
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_SME',
    -- 'PENDING_SME','APPROVED_BY_SME','ACCEPTED_BY_DESTINATION','REJECTED','CANCELLED'
    requested_at TIMESTAMPTZ DEFAULT now(), resolved_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

### 5.6. Diário de Classe: Notas, Frequência, Pareceres, Conteúdo

```sql
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    academic_period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 10),
    recovery_score NUMERIC(5,2), final_score NUMERIC(5,2),
    assessment_type VARCHAR(50) DEFAULT 'PERIOD_EXAM',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_grade_entry UNIQUE (enrollment_id, subject_id, academic_period_id)
);
-- nota efetiva = final_score, senão max(score, recovery_score), senão score

CREATE TABLE descriptive_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    academic_period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    development_report TEXT NOT NULL,
    learning_milestones JSONB DEFAULT '{}',   -- habilidades BNCC: {"EI03EO01": true, ...}
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_descriptive_entry UNIQUE (enrollment_id, academic_period_id)
);

CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    school_class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,  -- NULL = frequência por dia (anos iniciais)
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,   -- 'PRESENT','ABSENT','EXCUSED_ABSENCE'
    justification_note TEXT,
    CONSTRAINT uq_attendance_entry UNIQUE (enrollment_id, date, subject_id)
);

CREATE TABLE diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    content TEXT NOT NULL, homework TEXT, observations TEXT
);

CREATE TABLE school_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    total_classes INTEGER DEFAULT 0, absences INTEGER DEFAULT 0,
    attendance_percentage FLOAT DEFAULT 100,
    overall_average FLOAT,
    final_status VARCHAR(20) DEFAULT 'pending'   -- 'approved','failed','pending'
);
```

---

## 6. Matriz de Autorização e Controle de Acesso (RBAC)

O escopo é aplicado por `core/scopes.py::apply_scope()`, chamado pelos
*selectors* de cada domínio.

| Perfil / Papel | Escopo de Visibilidade | Ações Permitidas (implementadas) |
| :--- | :--- | :--- |
| **`sme_admin`** | Toda a rede municipal | CRUD de escolas, disciplinas, **professores** e **usuários** (`create_user`); criação de alocações; supervisão de matrículas, transferências e diário. |
| **`sme_supervisor`** | Toda a rede municipal | Leitura de toda a rede; criação de alocações; **autorização** de transferências. Não cadastra escolas/professores/usuários. |
| **`school_director`** | Apenas sua `School` | Edição dos dados da própria escola; CRUD de alunos e matrículas da unidade; leitura do diário e dos boletins consolidados da escola. |
| **`school_secretary`** | Apenas sua `School` | Lançamento de matrículas e emissão de documentos da unidade (mesmo escopo do diretor para alunos/matrículas). |
| **`teacher`** | Apenas turmas em `TeacherAllocation` | Lançamento **em lote** de notas e frequência, pareceres descritivos e diário das turmas alocadas (`CanEditGrades`). |
| **`student_guardian`** | Apenas o(s) `Student` vinculado(s) | Visualização de boletim, notas, frequência (dentro do boletim) e avisos. |

> **Nota de implementação.** O aceite de transferência pela escola de destino é
> `IsSchoolStaff` no backend, porém a tela de Transferências no frontend hoje
> só é exposta a papéis SME.

---

## 7. Regras de Negócio Implementadas

### 7.1. Envelope de erro padronizado
Toda falha de negócio retorna `{ "success": false, "error": { "code", "message", "details" } }` (`core/exceptions.py`).

### 7.2. Matrícula (`students/services/enrollment_service.py`)
`enroll_student_in_class()` executa em `@transaction.atomic` com `SELECT ... FOR UPDATE` na turma:
1. Turma e aluno existem (`CLASS_NOT_FOUND` / `STUDENT_NOT_FOUND`, 404).
2. **Sem matrícula ativa duplicada** no mesmo ano letivo (`DUPLICATE_ENROLLMENT`) — reforçado pelo índice parcial `uniq_active_enrollment_per_year`.
3. **Capacidade da turma** não excedida (`CLASS_CAPACITY_EXCEEDED`).

### 7.3. Alocação docente (`classes/services/allocation_service.py`)
`allocate_teacher()` com `SELECT ... FOR UPDATE` no perfil docente:
1. Perfil, turma e disciplina existem (404 tipado).
2. **Vínculo duplicado** *(professor + turma + disciplina)* → `DUPLICATE_ALLOCATION`.
3. **Conflito de agenda** → `TEACHER_SCHEDULE_CONFLICT`: o professor já está alocado em **outra** turma cujo turno se sobrepõe no **mesmo ano letivo** (`FULL_TIME` conflita com `MORNING` e `AFTERNOON`).

### 7.4. Transferência (`students/services/transfer_service.py`)
`authorize_transfer()` (SME: `PENDING_SME → APPROVED_BY_SME`) → `accept_transfer()` (escola de destino: `APPROVED_BY_SME → ACCEPTED_BY_DESTINATION`; apenas a unidade de destino pode aceitar).

### 7.5. Lançamento em lote (`class_diary/services/*_batch_service.py`)
`batch_upsert_grades()` / `batch_upsert_attendance()` particionam os itens (novos vs. existentes) numa consulta de *prefetch* e gravam com `bulk_create` / `bulk_update(batch_size=500)` — de ~80 consultas por turma para 1–2.

---

## 8. Endpoints REST (API v1)

Prefixo global `/api/v1/`. Documentação viva: `/api/docs/` (Swagger), `/api/redoc/`, `/api/schema/`.

```text
# Autenticação
POST   /api/v1/accounts/login/                     # -> { access, refresh }
POST   /api/v1/accounts/token/refresh/
GET    /api/v1/accounts/users/me/
POST   /api/v1/accounts/users/create_user/         # sme_admin: cria usuário com papel

# Governança & Escolas  (também sob /api/v1/sme/* — gateway do painel da SME)
GET    /api/v1/sme/departments/  ·  GET /api/v1/sme/departments/{id}/indicators/
GET    /api/v1/sme/academic-years/   ·  GET /api/v1/sme/academic-periods/
GET    /api/v1/schools/          POST /api/v1/schools/          # DELETE = soft-delete
GET    /api/v1/classrooms/       POST /api/v1/classrooms/

# Currículo (BNCC)
GET    /api/v1/subjects/                 POST /api/v1/subjects/
GET    /api/v1/curriculum/stages/  ·  /matrices/  ·  /matrix-items/
GET    /api/v1/sme/curriculum-matrices/  POST /api/v1/sme/curriculum-matrices/

# Turmas e Quadro Docente
GET    /api/v1/classes/
GET    /api/v1/teachers/                 POST /api/v1/teachers/         # também sob /api/v1/sme/teachers/
GET    /api/v1/teachers/allocations/     POST /api/v1/teachers/allocations/   # -> allocate_teacher()
DELETE /api/v1/teachers/allocations/{id}/

# Alunos, Responsáveis, Matrículas, Transferências
GET    /api/v1/students/                 POST /api/v1/students/
GET    /api/v1/students/{id}/academic-history/
GET    /api/v1/guardians/                POST /api/v1/guardians/
GET    /api/v1/enrollments/              POST /api/v1/enrollments/      # -> enroll_student_in_class()
GET    /api/v1/sme/transfers/            POST /api/v1/sme/transfers/
PATCH  /api/v1/sme/transfers/{id}/authorize/   ·   /accept/

# Diário de Classe
GET    /api/v1/grades/         POST /api/v1/grades/batch-upsert/
GET    /api/v1/attendance/     POST /api/v1/attendance/batch-upsert/
GET    /api/v1/evaluations/    POST /api/v1/evaluations/          # alias: /descriptive-evaluations/
GET    /api/v1/diary/          GET  /api/v1/history/

# Painel e Relatórios
GET    /api/v1/dashboard/summary/                  # contadores da rede, com escopo RBAC
GET    /api/v1/reports/boletim_pdf/   ·   /carteirinha_pdf/
GET    /api/v1/reports/relatorio_excel/   ·   /relatorio_csv/
GET    /api/v1/reports/educacenso-export/
```

---

## 9. Carga Inicial da Rede (Censo Escolar INEP)

Comando `manage.py seed_censo_igarassu` — monta a base do município a partir dos
dados públicos do **Censo Escolar 2025 do INEP** (recorte em
`apps/governance/data/censo_2025_igarassu/`; microdados brutos ficam em
`censo_2025/` na raiz, *git-ignored*).

As tabelas do Censo nesse formato são **agregadas por escola** (contagens
`QT_TUR_*`, `QT_MAT_*`), portanto **não há microdado individual** de aluno,
turma ou professor. O comando cria (idempotente):

* SME de Igarassu/PE + usuários `admin` e `supervisor`
* Ano letivo 2025 + 4 bimestres; 4 etapas de ensino; 9 disciplinas BNCC; 4 matrizes curriculares
* **49 escolas** (código INEP real; `school_type` inferido das etapas ofertadas)
* **~322 salas de aula** (de `QT_SALAS_UTILIZADAS`)
* **~535 turmas** — expandindo as contagens `QT_TUR_*` por série ("1º Ano A/B/…"), com turno distribuído conforme os pesos do Censo

O comando `manage.py seed_municipal` mantém uma rede fictícia de exemplo
(São Paulo), com alunos, matrículas, notas e frequência para testes ponta a ponta.

---

## 10. Referências

* [`ARCHITECTURE_BACKEND_DJANGO.md`](ARCHITECTURE_BACKEND_DJANGO.md) — padrão Services & Selectors, envelope de erro, RBAC.
* [`ARCHITECTURE_FRONTEND_REACT.md`](ARCHITECTURE_FRONTEND_REACT.md) — arquitetura Feature-Sliced, TanStack Query, refresh token.
* [`../README.md`](../README.md) — instalação, stack, endpoints.
* [`../tutoriais/`](../tutoriais/) — jornada de uso por papel (administrador, diretor, professor, responsável).

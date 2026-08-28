# RFC / Design Doc: Arquitetura do Sistema de Gestão da Rede Municipal de Ensino (SME)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Aprovado para Implementação |
| **Autor** | Equipe de Arquitetura & Engenharia de Software |
| **Versão** | 2.0.0 |
| **Data** | Agosto de 2026 |
| **Domínio** | Gestão Pública Municipal / Educação Básica |

---

## 1. Contexto e Justificativa de Negócio

### 1.1. Contexto Atual
O sistema escolar atual foi concebido com uma modelagem centrada em unidades escolares isoladas (*mono-unidade*), com entidades básicas (`School`, `Student`, `Class`, `Subject`, `Grade`, `Attendance`, `Enrollment`). 

### 1.2. Problema
Ao expandir a atuação para atender a **Secretaria Municipal de Educação (SME)**, o modelo isolado gera fragmentação, redundância e inconsistência de dados:
* **Duplicidade Cadastral de Estudantes:** Transferências entre escolas municipais geram cadastros duplicados e perda do histórico acadêmico unificado.
* **Descentralização Curricular:** Falta de padronização de Matrizes Curriculares (BNCC) e nomenclaturas de componentes curriculares.
* **Gestão Docente Fragmentada:** Professores do quadro municipal que lecionam em múltiplas escolas não possuem visão unificada de sua carga horária e diários de classe.
* **Falta de Suporte a Diferentes Modalidades:** A Educação Infantil e o Atendimento Educacional Especializado (AEE) exigem avaliações por **Pareceres Descritivos** e relatórios de desenvolvimento, incompatíveis com o modelo puramente quantitativo de notas (`Grade`).
* **Conformidade Legal:** Dificuldade na geração padronizada de arquivos do **Educacenso (INEP/MEC)** e controle da Central de Vagas/Fila Única.

---

## 2. Objetivos de Engenharia (Goals & Non-Goals)

### 2.1. Goals (Objetivos)
1. **Centralização Hierárquica (Top-Down):** A Secretaria Municipal de Educação como entidade raiz, estabelecendo calendários, diretrizes e matrizes para todas as escolas.
2. **Cadastro Único do Aluno:** Chave persistente em toda a trajetória escolar no município.
3. **Multi-Alocação Docente:** Permitir que o professor pertença ao quadro municipal e atue em turmas de diferentes escolas.
4. **Duplo Modelo Avaliativo:** Suportar avaliação quantitativa (notas numéricas/conceitos) e qualitativa (pareceres descritivos e relatórios de acompanhamento da Educação Infantil).
5. **RBAC Hierárquico Multi-Nível:** Permissões granulares com isolamento de escopo por nível de atuação (SME, Direção Escolar, Docente, Aluno/Responsável).

### 2.2. Non-Goals (Fora de Escopo)
* Gestão de redes estaduais ou federais (o escopo é estritamente municipal).
* Aplicativo mobile nativo (mantido o foco em arquitetura Web Responsiva).
* Módulo financeiro de folha de pagamento de servidores (integração via exportação/APIs externas).

---

## 3. Arquitetura de Domínio & Bounded Contexts (DDD)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   SECRETARIA MUNICIPAL DE EDUCAÇÃO                     │
│                        (EducationDepartment)                           │
└──────────────┬────────────────────────────┬────────────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────────┐ ┌───────────────────────────────────────┐
│     Contexto Pedagógico      │ │       Contexto Institucional          │
│ - AcademicYear               │ │ - School (Unidades Escolares)         │
│ - AcademicPeriod             │ │ - TeacherProfile (Quadro Municipal)   │
│ - EducationStage             │ │ - TransferRequest (Central de Vagas)  │
│ - CurriculumMatrix & Item    │ │                                       │
│ - Subject (Base Municipal)   │ │                                       │
└──────────────┬───────────────┘ └───────────────────┬───────────────────┘
               │                                     │
               └──────────────────┬──────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Contexto Escolar & Operacional                       │
│ - SchoolClass (Turma da Escola)                                        │
│ - TeacherAllocation (Alocação do Docente na Turma/Disciplina)          │
│ - Student (Cadastro Único Municipal) & Guardian                        │
│ - Enrollment (Matrícula Anual na Turma)                                │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Contexto do Diário de Classe                      │
│ - Grade (Notas Quantitativas por Bimestre/Disciplina)                  │
│ - DescriptiveEvaluation (Pareceres Descritivos da Educação Infantil)   │
│ - Attendance (Frequência Escolar Diária)                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Dicionário de Dados e Especificação de Entidades

### 4.1. Núcleo Institucional & Estrutura da Rede

#### 4.1.1. `EducationDepartment` (Secretaria Municipal de Educação)
* **Finalidade:** Tenant raiz e entidade de governança educacional do município.
```sql
CREATE TABLE education_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_name VARCHAR(150) NOT NULL,
    ibge_code VARCHAR(7) NOT NULL UNIQUE,
    secretary_name VARCHAR(150),
    min_passing_grade NUMERIC(4, 2) DEFAULT 6.00,
    min_attendance_percentage NUMERIC(5, 2) DEFAULT 75.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.1.2. `School` (Unidade Escolar)
* **Finalidade:** Unidade física e administrativa subordinada à SME.
```sql
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    inep_code VARCHAR(8) UNIQUE,
    name VARCHAR(200) NOT NULL,
    cnpj VARCHAR(14) UNIQUE,
    school_type VARCHAR(50) NOT NULL, -- 'CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_1', 'FUNDAMENTAL_2', 'EJA', 'MISTA'
    director_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    address_street VARCHAR(255),
    address_number VARCHAR(20),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zip_code VARCHAR(8),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_schools_department ON schools(education_department_id);
```

#### 4.1.3. `AcademicYear` e `AcademicPeriod` (Ano Letivo e Períodos)
* **Finalidade:** Controle temporal e prazos do calendário municipal unificado.
```sql
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    year INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED', -- 'PLANNED', 'ACTIVE', 'CLOSED'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CONSTRAINT uq_academic_year_dept UNIQUE (education_department_id, year)
);

CREATE TABLE academic_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- '1º Bimestre', '2º Bimestre', etc.
    period_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    grade_deadline DATE NOT NULL,
    CONSTRAINT uq_academic_period UNIQUE (academic_year_id, period_number)
);
```

---

### 4.2. Estrutura Curricular da Rede (Alinhamento BNCC)

#### 4.2.1. `EducationStage` e `Subject`
```sql
CREATE TABLE education_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- 'Educação Infantil (4 e 5 anos)', 'Ensino Fundamental - Anos Iniciais'
    code VARCHAR(20) NOT NULL UNIQUE,
    stage_type VARCHAR(50) NOT NULL, -- 'INFANTIL', 'FUNDAMENTAL_I', 'FUNDAMENTAL_II', 'EJA'
    evaluation_type VARCHAR(30) NOT NULL -- 'NUMERIC', 'CONCEPT', 'DESCRIPTIVE'
);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    bncc_code VARCHAR(50),
    area_of_knowledge VARCHAR(100) NOT NULL, -- 'Linguagens', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas'
    CONSTRAINT uq_subject_dept_name UNIQUE (education_department_id, name)
);
```

#### 4.2.2. `CurriculumMatrix` e `CurriculumMatrixItem`
```sql
CREATE TABLE curriculum_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    education_stage_id UUID NOT NULL REFERENCES education_stages(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL, -- 'Matriz Padrão 5º Ano EF - 2026'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE curriculum_matrix_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_matrix_id UUID NOT NULL REFERENCES curriculum_matrices(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    weekly_hours INTEGER NOT NULL,
    annual_hours INTEGER NOT NULL,
    CONSTRAINT uq_matrix_subject UNIQUE (curriculum_matrix_id, subject_id)
);
```

---

### 4.3. Turmas, Servidores e Alocação Docente

#### 4.3.1. `SchoolClass` (Turma)
```sql
CREATE TABLE school_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    curriculum_matrix_id UUID NOT NULL REFERENCES curriculum_matrices(id) ON DELETE RESTRICT,
    name VARCHAR(50) NOT NULL, -- '5º Ano A', 'Berçário II'
    shift VARCHAR(20) NOT NULL, -- 'MORNING', 'AFTERNOON', 'FULL_TIME', 'NIGHT'
    max_capacity INTEGER NOT NULL DEFAULT 30,
    room_number VARCHAR(20),
    inep_class_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_school_classes_lookup ON school_classes(school_id, academic_year_id);
```

#### 4.3.2. `TeacherProfile` e `TeacherAllocation`
```sql
CREATE TABLE teacher_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    registration_number VARCHAR(50) NOT NULL UNIQUE, -- Matrícula funcional municipal
    cpf VARCHAR(11) NOT NULL UNIQUE,
    formation_area VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE teacher_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    school_class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE, -- NULL caso seja professor unidocente / regente integral
    is_regent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_allocation UNIQUE (teacher_profile_id, school_class_id, subject_id)
);
```

---

### 4.4. Alunos, Responsáveis, Matrículas e Fluxo Escolar

#### 4.4.1. `Student` e `Guardian` (Cadastro Único Municipal)
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_department_id UUID NOT NULL REFERENCES education_departments(id) ON DELETE RESTRICT,
    unique_municipal_id VARCHAR(20) NOT NULL UNIQUE, -- Identificador único na rede
    inep_id VARCHAR(12) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    social_name VARCHAR(200),
    cpf VARCHAR(11) UNIQUE,
    birth_certificate VARCHAR(50),
    nis_code VARCHAR(15), -- Bolsa Família / Auxílio Municipal
    birth_date DATE NOT NULL,
    gender VARCHAR(20),
    race_color VARCHAR(30), -- Conforme padrões INEP/Censo
    mother_name VARCHAR(200) NOT NULL,
    father_name VARCHAR(200),
    has_special_needs BOOLEAN DEFAULT FALSE,
    special_needs_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(200) NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    address VARCHAR(255)
);

CREATE TABLE student_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    kinship_type VARCHAR(50) NOT NULL, -- 'MOTHER', 'FATHER', 'LEGAL_GUARDIAN', 'GRANDPARENT'
    is_emergency_contact BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_student_guardian UNIQUE (student_id, guardian_id)
);
```

#### 4.4.2. `Enrollment` (Matrícula) e `TransferRequest` (Transferência)
```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    school_class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE RESTRICT,
    enrollment_number VARCHAR(50) NOT NULL UNIQUE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ENROLLED',
    -- 'ENROLLED', 'APPROVED', 'FAILED_ACADEMIC', 'FAILED_ATTENDANCE', 
    -- 'TRANSFERRED_INTERNAL', 'TRANSFERRED_EXTERNAL', 'DROPOUT', 'DECEASED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_enrollments_student_class ON enrollments(student_id, school_class_id);

CREATE TABLE transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    origin_school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    destination_school_id UUID REFERENCES schools(id) ON DELETE RESTRICT, -- NULL se externa ao município
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_SME', 
    -- 'PENDING_SME', 'APPROVED_BY_SME', 'ACCEPTED_BY_DESTINATION', 'REJECTED', 'CANCELLED'
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

---

### 4.5. Diário de Classe: Notas, Frequência e Pareceres

```sql
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    academic_period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    score NUMERIC(5, 2) NOT NULL,
    recovery_score NUMERIC(5, 2),
    final_score NUMERIC(5, 2),
    assessment_type VARCHAR(50) DEFAULT 'PERIOD_EXAM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_grade_entry UNIQUE (enrollment_id, subject_id, academic_period_id)
);

CREATE TABLE descriptive_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    academic_period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    development_report TEXT NOT NULL,
    learning_milestones JSONB, -- Habilidades BNCC alcançadas: {"EI03EO01": true, "EI03CG02": false}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_descriptive_entry UNIQUE (enrollment_id, academic_period_id)
);

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    school_class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE, -- Nullable para anos iniciais (frequência por dia)
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'PRESENT', 'ABSENT', 'EXCUSED_ABSENCE'
    justification_note TEXT,
    CONSTRAINT uq_attendance_entry UNIQUE (enrollment_id, date, subject_id)
);
```

---

## 5. Matriz de Autorização e Controle de Acesso (RBAC)

| Perfil / Papel | Escopo de Visibilidade | Ações Permitidas |
| :--- | :--- | :--- |
| **Administrador da SME (`sme_admin`)** | Toda a rede municipal | CRUD completo de escolas, matrizes, anos letivos, supervisão geral de vagas e relatórios. |
| **Supervisor Pedagógico da SME (`sme_supervisor`)** | Toda a rede municipal | Leitura de todas as escolas, auditoria de notas, validação de pareceres e autorização de transferências. |
| **Diretor / Gestor Escolar (`school_director`)** | Apenas sua `School` vinculada | Gestão administrativa da unidade, alocação de salas, homologação de matrículas e relatórios da escola. |
| **Secretário Escolar (`school_secretary`)** | Apenas sua `School` vinculada | Lançamento de matrículas, emissão de documentos oficiais (histórico, declaração) e transferências locais. |
| **Professor (`teacher`)** | Apenas turmas e disciplinas alocadas em `TeacherAllocation` | Lançamento de notas, registro diário de frequência, elaboração de pareceres descritivos. |
| **Aluno / Responsável (`student_guardian`)** | Apenas os registros vinculados ao seu `Student` | Visualização de boletim, pareceres pedagógicos, frequência e avisos institucionais. |

---

## 6. Endpoints REST da Camada Municipal (API v1)

```
# Governança Municipal & Escolas
GET    /api/v1/sme/departments/
GET    /api/v1/sme/departments/{id}/indicators/
GET    /api/v1/sme/schools/
POST   /api/v1/sme/schools/
GET    /api/v1/sme/schools/{id}/

# Matrizes Curriculares & BNCC
GET    /api/v1/sme/stages/
GET    /api/v1/sme/curriculum-matrices/
POST   /api/v1/sme/curriculum-matrices/
GET    /api/v1/sme/subjects/
POST   /api/v1/sme/subjects/

# Central de Vagas & Transferências
GET    /api/v1/sme/transfers/
POST   /api/v1/sme/transfers/
PATCH  /api/v1/sme/transfers/{id}/authorize/
PATCH  /api/v1/sme/transfers/{id}/accept/

# Gestão do Quadro Docente
GET    /api/v1/sme/teachers/
POST   /api/v1/sme/teachers/
POST   /api/v1/sme/teachers/allocations/
DELETE /api/v1/sme/teachers/allocations/{id}/

# Alunos & Cadastro Único
GET    /api/v1/students/ (Filtros por CPF, Matrícula Municipal, INEP, Nome da Mãe)
POST   /api/v1/students/
GET    /api/v1/students/{id}/academic-history/

# Diário de Classe & Avaliações
POST   /api/v1/grades/batch-upsert/
POST   /api/v1/attendance/batch-upsert/
POST   /api/v1/descriptive-evaluations/
GET    /api/v1/reports/educacenso-export/
```

---

## 7. Estratégia de Migração e Evolução

1. **Fase 1 (Backbone Institucional):**
   * Criação das tabelas `education_departments`, `academic_years`, `academic_periods`, `education_stages` e `curriculum_matrices`.
   * Migração de dados legados: Vincular as escolas existentes (`School`) a um departamento de educação padrão do município.
2. **Fase 2 (Padronização Curricular):**
   * Mapeamento de componentes curriculares locais (`Subject`) para a base única da BNCC municipal.
   * Criação das matrizes curriculares e vinculação às turmas (`SchoolClass`).
3. **Fase 3 (Cadastro Único e Histórico):**
   * Atribuição de `unique_municipal_id` para os alunos existentes.
   * Isolamento do módulo de `transfer_requests`.
4. **Fase 4 (Diário de Classe & Pareceres):**
   * Implantação de `descriptive_evaluations` para turmas de Educação Infantil.
   * Ajuste dos endpoints de `Grade` e `Attendance` para respeitarem `TeacherAllocation`.

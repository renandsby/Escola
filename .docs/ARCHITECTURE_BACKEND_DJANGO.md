# Design Doc & Padrões Arquiteturais: Backend Django / DRF

| Metadado | Detalhe |
| :--- | :--- |
| **Documento** | Diretrizes de Arquitetura, Clean Code e Padrões de Engenharia Backend |
| **Stack** | Python ≥ 3.13, Django 6.1, Django REST Framework 3.18, PostgreSQL 16, Redis 8, Celery 5.6 |
| **Público-Alvo** | Agentes de IA, Tech Leads, Engenheiros de Software |
| **Status** | Padrão Oficial & Obrigatório do Projeto |

---

## 1. Filosofia de Engenharia e Princípios Fundamentais

O backend do Sistema de Gestão da Rede Municipal de Ensino adota uma variação pragmática da **Clean Architecture** e **Domain-Driven Design (DDD)** adaptada ao ecossistema Django, baseada no padrão **Services & Selectors (Django Styleguide)**.

### Princípios Inegociáveis:
1. **Thin Models, Thin Views, Fat Domain/Services:**
   * **Models:** Apenas definições de schema, constraints, propriedades computadas simples e métodos estritamente ligados à integridade do registro.
   * **Views/ViewSets:** Apenas controle de fluxo HTTP (receber request, autenticar/autorizar, chamar serializer/service/selector e retornar response).
   * **Services (Commands/Mutations):** Concentram toda a lógica de negócio, transações (`atomic`), envio de e-mails/notificações e integração externa.
   * **Selectors (Queries):** Concentram toda a lógica de busca, filtros, agregações e otimizações de query (`select_related`, `prefetch_related`).
2. **Separação Estrita de I/O e Validação:**
   * Serializers de entrada (**Input Serializers**) validam tipos e formatos de payload.
   * Services validam regras de negócio de domínio (ex: limite de alunos na turma, conflito de horário docente).
   * Serializers de saída (**Output Serializers**) apenas formatam representações JSON.
3. **Isolamento de Escopo e Multi-Tenancy:**
   * Toda query deve ser restrita ao tenant (`EducationDepartment`) ou à escola vinculada ao usuário logado, nunca expondo dados globais sem checagem de RBAC.

---

## 2. Estrutura Modular de Diretórios (App-Based)

Cada funcionalidade do sistema é organizada em um Django App autocontido dentro do diretório `apps/`. A estrutura interna de cada app **deve** seguir rigorosamente o layout abaixo:

```text
backend/
├── apps/
│   ├── authentication/           # API de autenticação JWT, perfil, reset de senha
│   ├── governance/               # SME, Anos Letivos, Matrizes, LGPD (privacy_service), fechamento de ano
│   ├── schools/                  # Unidades Escolares, Infraestrutura física
│   ├── curriculum/               # Componentes curriculares, Etapas BNCC
│   ├── classes/                  # Turmas, Salas, Alocações Docentes
│   ├── students/                 # Alunos, Responsáveis, Matrículas, Transferências, Portal da família
│   ├── class_diary/              # Notas, Frequência, Pareceres, Conteúdo, Consolidação de histórico
│   ├── reports/                  # Boletim/carteirinha PDF, Excel/CSV, Educacenso, relatórios assíncronos
│   ├── dashboard/                # Agregações da rede, contexto institucional do cabeçalho
│   ├── documents/                # Upload validado de documentos (magic bytes, escopo RBAC)
│   ├── notifications/            # Notificações in-app + notification_service (gatilhos de negócio)
│   ├── communications/           # Mensagens entre usuários
│   ├── audit/                    # AuditLog (gravado por core/middleware.py::AuditMiddleware)
│   ├── backups/                  # pg_dump agendado (Celery beat) + retenção
│   └── health/                   # /health/live/ e /health/ready/
│
├── core/                         # Utilitários compartilhados
│   ├── models.py                 # BaseModel (UUID, timestamps) · SoftDeleteModel · User · UserRole
│   ├── scopes.py                 # apply_scope() — isolamento RBAC por papel (usado pelos selectors)
│   ├── exceptions.py             # BusinessLogicError + custom_exception_handler (envelope de erro)
│   ├── middleware.py             # AuditMiddleware
│   ├── pagination.py             # Paginação padrão da API
│   └── permissions.py            # RBAC (IsSMEAdmin, IsSMEStaff, IsSchoolStaff, …)
│
└── config/                       # Settings, WSGI, ASGI, URLs raiz, celery.py
```

> O modelo de usuário (`core.User`, `AUTH_USER_MODEL`) e o `apply_scope()`
> ficam em **`core/`**; o app `authentication` é só a camada de API em torno
> deles.

### 2.1. Estrutura Interna de cada Django App:
```text
apps/<app_name>/
├── api/
│   ├── __init__.py
│   ├── urls.py                   # Rotas específicas do app
│   ├── views.py                  # APIViews / ViewSets (Thin Controllers)
│   ├── serializers.py            # Input e Output serializers
│   └── permissions.py            # Permissões customizadas do app
├── services/                     # CAMADA DE ESCRITA / MUTATIONS (Commands)
│   ├── __init__.py
│   ├── school_creation.py
│   └── transfer_processor.py
├── selectors/                    # CAMADA DE LEITURA / QUERIES (Selectors)
│   ├── __init__.py
│   ├── schools.py
│   └── student_history.py
├── models/                       # CAMADA DE DOMÍNIO (Persistência)
│   ├── __init__.py
│   ├── school.py
│   └── school_unit.py
├── tasks/                        # Celery tasks assíncronas
│   └── __init__.py
└── tests/                        # Testes automatizados
    ├── factories.py              # FactoryBoy model factories
    ├── test_services.py          # Testes unitários dos services
    ├── test_selectors.py         # Testes de queries e filtros
    └── test_apis.py              # Testes de integração de endpoints
```

---

## 3. Padrões de Implementação por Camada

### 3.1. Camada de Leitura: `selectors/`
* **Regra:** Funções puras de consulta. **Nunca alteram estado no banco de dados.**
* **Regra de Otimização:** Devem utilizar `select_related` para `ForeignKey/OneToOne` e `prefetch_related` para `ManyToMany/Reverse FK`, erradicando problemas de N+1.
* **Retorno:** Devem retornar `QuerySet` ou DTOs tipados.

```python
# apps/schools/selectors/schools.py
from typing import Optional
from uuid import UUID
from django.db.models import QuerySet
from apps.schools.models import School
from apps.authentication.models import User

def get_schools_for_user(*, user: User, is_active: Optional[bool] = True) -> QuerySet[School]:
    qs = School.objects.select_related("education_department", "director")
    
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
        
    if user.is_sme_admin:
        return qs.filter(education_department=user.education_department)
    elif user.is_school_director or user.is_teacher:
        return qs.filter(id__in=user.assigned_school_ids)
    
    return School.objects.none()

def get_school_by_id(*, school_id: UUID, user: User) -> Optional[School]:
    return get_schools_for_user(user=user).filter(id=school_id).first()
```

---

### 3.2. Camada de Escrita: `services/`
* **Regra:** Todas as alterações de estado, validações de regra de negócio complexas e orquestração de efeitos colaterais residem aqui.
* **Regra de Transação:** Modificações que afetam mais de uma tabela **devem** ser decoradas com `@transaction.atomic`.
* **Regra de Exceção:** Lançar exceções de domínio (`BusinessLogicError`) que serão interceptadas pelo handler global.
* **`ATOMIC_REQUESTS = True`:** cada request já roda dentro de uma transação, e
  respostas **4xx/5xx fazem *rollback*** — inclusive de gravações feitas por
  serializers/serviços chamados no caminho. Efeitos que **precisam sobreviver a
  um 4xx** (ex.: registrar um *login falho* na auditoria) devem ser feitos **no
  `process_response` de um middleware**, fora do bloco atômico da view.
* **`select_for_update(of=('self',))`** quando a *query* de trava tem
  `select_related` numa FK anulável (evita `FOR UPDATE cannot be applied to the
  nullable side of an outer join`).
* **Notificações/efeitos colaterais** passam por `notify_user()` / `notify_role()`
  (`notifications/services/`) e nunca criam `Notification` direto.

```python
# apps/students/services/enrollment_service.py
from uuid import UUID
from django.db import transaction
from core.exceptions import BusinessLogicError
from apps.students.models import Student, Enrollment
from apps.classes.models import SchoolClass
from apps.authentication.models import User

@transaction.atomic
def enroll_student_in_class(
    *,
    student_id: UUID,
    school_class_id: UUID,
    actor_user: User
) -> Enrollment:
    school_class = SchoolClass.objects.select_for_update().filter(id=school_class_id).first()
    if not school_class:
        raise BusinessLogicError(code="CLASS_NOT_FOUND", message="Turma informada não existe.")
        
    student = Student.objects.filter(id=student_id).first()
    if not student:
        raise BusinessLogicError(code="STUDENT_NOT_FOUND", message="Aluno informado não existe.")

    # 1. Validar se o aluno já possui matrícula ativa no mesmo ano letivo
    has_active_enrollment = Enrollment.objects.filter(
        student=student,
        school_class__academic_year=school_class.academic_year,
        status="ENROLLED"
    ).exists()
    
    if has_active_enrollment:
        raise BusinessLogicError(
            code="DUPLICATE_ENROLLMENT", 
            message="Aluno já possui uma matrícula ativa para este ano letivo."
        )

    # 2. Validar limite de capacidade da turma
    current_enrolled_count = Enrollment.objects.filter(
        school_class=school_class, 
        status="ENROLLED"
    ).count()
    
    if current_enrolled_count >= school_class.max_capacity:
        raise BusinessLogicError(
            code="CLASS_CAPACITY_EXCEEDED", 
            message=f"Turma atingiu a capacidade máxima de {school_class.max_capacity} alunos."
        )

    # 3. Criar registro de matrícula
    enrollment = Enrollment.objects.create(
        student=student,
        school_class=school_class,
        status="ENROLLED",
        created_by=actor_user
    )
    
    return enrollment
```

---

### 3.3. Camada de Serialização: `serializers.py`
* **Regra:** Serializers de entrada e saída devem ser separados para evitar vazamento de dados e acoplamento desnecessário.
* Não colocar consultas de banco complexas dentro de `to_representation` ou `validate_<campo>`.

```python
# apps/students/api/serializers.py
from rest_framework import serializers
from apps.students.models import Student, Enrollment

class StudentEnrollmentInputSerializer(serializers.Serializer):
    student_id = serializers.UUIDField(required=True)
    school_class_id = serializers.UUIDField(required=True)

class StudentDetailOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            "id",
            "unique_municipal_id",
            "full_name",
            "social_name",
            "birth_date",
            "mother_name",
            "has_special_needs",
        ]

class EnrollmentOutputSerializer(serializers.ModelSerializer):
    student = StudentDetailOutputSerializer(read_only=True)
    class_name = serializers.CharField(source="school_class.name", read_only=True)
    school_name = serializers.CharField(source="school_class.school.name", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "enrollment_number",
            "status",
            "enrollment_date",
            "student",
            "class_name",
            "school_name",
        ]
```

---

### 3.4. Camada de API / Controladores: `views.py`
* As views são estritamente responsáveis por:
  1. Validar payload de entrada usando o Input Serializer.
  2. Executar Service (para mutação) ou Selector (para busca).
  3. Serializar o retorno usando o Output Serializer com o HTTP Status correto.

```python
# apps/students/api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.permissions import IsSchoolSecretaryOrDirector
from apps.students.api.serializers import (
    StudentEnrollmentInputSerializer,
    EnrollmentOutputSerializer,
)
from apps.students.services.enrollment_service import enroll_student_in_class

class StudentEnrollmentApi(APIView):
    permission_classes = [IsSchoolSecretaryOrDirector]

    def post(self, request):
        input_serializer = StudentEnrollmentInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        enrollment = enroll_student_in_class(
            student_id=input_serializer.validated_data["student_id"],
            school_class_id=input_serializer.validated_data["school_class_id"],
            actor_user=request.user
        )

        output_serializer = EnrollmentOutputSerializer(enrollment)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
```

---

## 4. Tratamento Global de Exceções & Envelope de Resposta

Toda resposta da API deve aderir a um contrato unificado. Erros nunca devem retornar traces brutos ou formatos arbitrários do Django.

### 4.1. Estrutura Padrão de Erro JSON:
```json
{
  "success": false,
  "error": {
    "code": "CLASS_CAPACITY_EXCEEDED",
    "message": "Turma atingiu a capacidade máxima de 30 alunos.",
    "details": null
  }
}
```

### 4.2. Custom Exception Handler:
```python
# core/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError

class BusinessLogicError(Exception):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, BusinessLogicError):
        return Response({
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": None
            }
        }, status=exc.status_code)

    if isinstance(exc, DRFValidationError):
        return Response({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Dados inválidos enviados na requisição.",
                "details": response.data if response else exc.detail
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    if response is not None:
        return Response({
            "success": False,
            "error": {
                "code": exc.__class__.__name__.upper(),
                "message": str(exc),
                "details": response.data
            }
        }, status=response.status_code)

    return Response({
        "success": False,
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Ocorreu um erro interno inesperado no servidor.",
            "details": None
        }
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

---

## 5. Práticas de Banco de Dados e Performance

1. **UUID como Chave Primária:** Todas as entidades públicas e relacionais devem utilizar UUIDv4 para impedir ataques de enumeração (`IDOR`).
2. **Auditoria Padrão:** Todas as tabelas herdam de `TimeStampedModel` (`created_at`, `updated_at`).
3. **Operações em Lote:** Inserções ou atualizações de diário (ex: lançamento de notas de 40 alunos) **devem** utilizar `bulk_create` / `bulk_update` com `batch_size=500` para evitar dezenas de queries sequenciais.
4. **Índices Estratégicos:**
   * Índices compostos em chaves estrangeiras comumente filtradas juntas (ex: `(school_id, academic_year_id)`).
   * Índices em campos de busca textual (`cpf`, `unique_municipal_id`, `inep_code`).

---

## 6. Padrões de Testes Automatizados (Backend)

* **Ferramental:** `pytest`, `pytest-django`, `factory_boy`, `faker`.
* **Regra de Cobertura:** Todos os `services` e `selectors` devem possuir cobertura de testes unitários superior a **85%**.
* **Isolamento:** Testes unitários de Service testam a regra de negócio; testes de API testam autenticação, permissões e status codes HTTP.

```python
# apps/students/tests/test_services.py
import pytest
from core.exceptions import BusinessLogicError
from apps.students.services.enrollment_service import enroll_student_in_class
from apps.students.tests.factories import StudentFactory, SchoolClassFactory, UserFactory

@pytest.mark.django_db
class TestEnrollmentService:
    def test_should_enroll_student_successfully(self):
        student = StudentFactory()
        school_class = SchoolClassFactory(max_capacity=20)
        actor = UserFactory()

        enrollment = enroll_student_in_class(
            student_id=student.id,
            school_class_id=school_class.id,
            actor_user=actor
        )

        assert enrollment.status == "ENROLLED"
        assert enrollment.student == student
        assert enrollment.school_class == school_class

    def test_should_raise_error_when_class_capacity_is_exceeded(self):
        school_class = SchoolClassFactory(max_capacity=1)
        student_1 = StudentFactory()
        student_2 = StudentFactory()
        actor = UserFactory()

        enroll_student_in_class(student_id=student_1.id, school_class_id=school_class.id, actor_user=actor)

        with pytest.raises(BusinessLogicError) as exc_info:
            enroll_student_in_class(student_id=student_2.id, school_class_id=school_class.id, actor_user=actor)

        assert exc_info.value.code == "CLASS_CAPACITY_EXCEEDED"
```

---

## 7. Diretrizes Críticas para Agentes de IA (Backend DOs & DON'Ts)

| Ação Proibida (DON'T) ❌ | Ação Obrigatória (DO) ✅ |
| :--- | :--- |
| **NUNCA** coloque regras de negócio ou mutações complexas dentro de Serializers (`create()`, `update()`, `to_representation()`). | **SEMPRE** encapsule mutações e regras de negócio em funções puras na camada `services/`. |
| **NUNCA** execute queries com filtro aberto dentro de Views sem aplicar o filtro do tenant/escola do usuário logado. | **SEMPRE** utilize `selectors/` que recebam o `user` autenticado e apliquem o isolamento de escopo. |
| **NUNCA** gere código que execute queries N+1 (iterações sobre relações em loops sem prefetch). | **SEMPRE** utilize `.select_related()` para ForeignKey/OneToOne e `.prefetch_related()` para M2M/Reverse FK. |
| **NUNCA** use `print()` ou omita tratamento de exceções com blocos `except: pass`. | **SEMPRE** use o módulo `logging` do Python e lance `BusinessLogicError` tipadas. |
| **NUNCA** crie endpoints sem declarar explicitamente classes de permissão (`permission_classes`). | **SEMPRE** defina permissões baseadas no RBAC municipal em cada View/ViewSet. |
| **NUNCA** retorne chaves inteiras sequenciais previsíveis em APIs REST. | **SEMPRE** utilize chaves primárias do tipo `UUID` (v4). |

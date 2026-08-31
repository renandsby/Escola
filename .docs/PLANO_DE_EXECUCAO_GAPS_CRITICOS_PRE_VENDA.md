# PLANO DE EXECUÇÃO — GAPS CRÍTICOS PRÉ-VENDA

**Documento:** Plano de implementação executivo  
**Referência:** DX-SGE-002/2026  
**Data:** 30 de agosto de 2026  
**Versão:** 1.0.0  
**Baseado em:** Diagnóstico de Prontidão (DX-SGE-001/2026)  

---

## 1. CONTEXTO E OBJETIVO

### 1.1 Situação atual

O diagnóstico comercial (DX-SGE-001/2026) identificou que o sistema SGE Municipal está em **88% de prontidão** para produção. Três gaps foram classificados como **CRÍTICOS para demonstração comercial**:

1. ❌ **Emissão de histórico escolar em PDF** — atualmente só boletim e carteirinha
2. ❌ **Tela de Responsáveis completa** — atualmente placeholder, mas API completa
3. ❌ **Aceite LGPD obrigatório** — hoje opcional na ficha do aluno

### 1.2 Impacto comercial

Estes gaps **comprometem apresentações para possíveis compradores**:
- Histórico escolar é documento oficial fundamental que será questionado
- Placeholder de Responsáveis compromete percepção de completude
- LGPD é diferencial de compliance para compradores públicos

### 1.3 Infraestrutura já pronta

✅ ReportLab 5.0.1 configurado para geração de PDF  
✅ API REST completa de responsáveis (`/api/v1/guardians/`)  
✅ Modelo `ConsentRecord` e serviço de privacidade  
✅ Padrões estabelecidos (boletim, carteirinha, CRUDs de alunos/professores)  

**Não há bloqueios técnicos.** Os 3 itens podem ser desenvolvidos em **paralelo**.

---

## 2. ESCOPO DETALHADO

### 2.1 GAP 1 — Histórico Escolar em PDF

#### Objetivo
Gerar PDF oficial do histórico escolar do aluno com dados consolidados do ano letivo.

#### Situação atual
- ✅ Modelo `SchoolHistory` existe (`backend/apps/class_diary/models/school_history.py`)
- ✅ Consolidação automática no fechamento do ano (`year_closing_service.py`)
- ✅ Boletim e carteirinha já geram PDF via ReportLab
- ❌ Não existe gerador de PDF do histórico
- ❌ Não existe endpoint `historico_pdf`
- ❌ Não existe botão de download na ficha do aluno

#### Arquivos de referência
| Propósito | Caminho absoluto |
|-----------|------------------|
| Gerador de PDF existente | `backend/apps/reports/services/pdf_generator.py` |
| ViewSet de reports | `backend/apps/reports/api/views.py` |
| Selectors de dados | `backend/apps/reports/selectors/reports.py` |
| Modelo SchoolHistory | `backend/apps/class_diary/models/school_history.py` |
| Testes de reports | `backend/tests/reports/test_reports.py` |
| Ficha do aluno (frontend) | `frontend/src/features/students/pages/StudentDetailPage.tsx` |

#### Dados necessários
- Identificação: aluno, escola, ano letivo, série/turma
- Desempenho: disciplinas cursadas, notas por período, nota final
- Frequência: total de aulas, faltas, percentual de presença
- Carga horária: total por disciplina
- Situação final: APROVADO / REPROVADO / CURSANDO
- Assinaturas: diretor, secretário escolar

**Fontes de dados:**
- `Student` — identificação
- `Enrollment` — turma, escola, ano letivo
- `Grade` — notas por disciplina/período
- `Attendance` — frequência
- `SchoolHistory` — consolidação (média geral, status)
- `Subject` — disciplinas e carga horária

#### Decisão de design
**Para MVP pré-venda:** gerar histórico **do ano letivo atual** apenas.

O modelo `SchoolHistory` atual é `OneToOne` com `Student` (snapshot único). Para histórico multi-ano, seria necessário refatorar para guardar `ano_letivo`. Isso fica para pós-venda/customizações.

---

### 2.2 GAP 2 — Tela de Responsáveis

#### Objetivo
Substituir placeholder por CRUD completo de responsáveis com gestão de vínculos aluno-responsável.

#### Situação atual
- ✅ API backend completa (`/api/v1/guardians/` + `/links/`)
- ✅ Portal "Meus Filhos" funciona para responsáveis logados
- ✅ Modelos `Guardian` e `StudentGuardian` com soft-delete
- ❌ Rota `/responsaveis` usa `PlaceholderPage`
- ❌ Não existem páginas de lista/form/detalhe no frontend

#### Arquivos de referência
| Propósito | Caminho absoluto |
|-----------|------------------|
| API de responsáveis | `backend/apps/students/api/guardian_urls.py` |
| ViewSets | `backend/apps/students/api/views.py` (GuardianViewSet, StudentGuardianViewSet) |
| Serializers | `backend/apps/students/api/serializers.py` |
| Modelos | `backend/apps/students/models/guardian.py` |
| Roteador atual | `frontend/src/app/routes/AppRoutes.tsx` (linha ~107) |
| Placeholder | `frontend/src/components/feedback/PlaceholderPage.tsx` |
| Portal Meus Filhos | `frontend/src/features/guardians/pages/GuardianPortalPage.tsx` |
| **REFERÊNCIA PRINCIPAL** | `frontend/src/features/students/pages/StudentsListPage.tsx` |

#### API disponível
```
GET    /api/v1/guardians/               # Listar responsáveis
POST   /api/v1/guardians/               # Criar responsável
GET    /api/v1/guardians/{id}/          # Detalhe
PUT    /api/v1/guardians/{id}/          # Atualizar
DELETE /api/v1/guardians/{id}/          # Soft-delete

GET    /api/v1/guardians/links/         # Listar vínculos
POST   /api/v1/guardians/links/         # Criar vínculo aluno-responsável
DELETE /api/v1/guardians/links/{id}/    # Remover vínculo

GET    /api/v1/guardians/my-dependents/ # Portal (responsável logado)
```

**Filtros disponíveis:**
- Responsáveis: `is_active`, search em `full_name`, `cpf`, `phone`, `email`
- Vínculos: `student`, `guardian`, `kinship_type`, `is_emergency_contact`

#### Modelo de dados
```python
# Guardian
- full_name: str (obrigatório)
- cpf: str (unique, obrigatório)
- phone: str
- email: EmailField
- address: TextField
- occupation: str
- user: OneToOne User (opcional, para acesso ao portal)
- is_active: bool (soft-delete)

# StudentGuardian (vínculo N:N)
- student: FK Student
- guardian: FK Guardian
- kinship_type: MOTHER | FATHER | LEGAL_GUARDIAN | GRANDPARENT | OTHER
- is_emergency_contact: bool
```

#### Estrutura a criar

**Frontend — nova estrutura de diretórios:**
```
frontend/src/features/guardians/
├── pages/
│   ├── GuardiansListPage.tsx       # Lista com busca/filtros
│   ├── GuardianFormPage.tsx        # Criar/editar
│   └── GuardianDetailPage.tsx      # Ficha + vínculos
├── components/
│   ├── GuardianCard.tsx            # (opcional)
│   └── StudentLinkModal.tsx        # Modal para adicionar vínculo
└── GuardianPortalPage.tsx          # (já existe)
```

**Padrão a seguir:** `StudentsListPage.tsx` é a melhor referência (usa `useCrud`, `DataTable`, `PageHeader`, `ScopeBar`).

---

### 2.3 GAP 3 — LGPD Obrigatório

#### Objetivo
Tornar o aceite de termos LGPD obrigatório no fluxo de cadastro/matrícula de alunos.

#### Situação atual
- ✅ Modelo `ConsentRecord` existe
- ✅ Serviço `privacy_service.py` com `record_consent()` e `get_consent_status()`
- ✅ Tipos de consentimento: `MATRICULA_USO_DADOS`, `USO_IMAGEM`, `COMUNICACAO`
- ❌ Aceite não é obrigatório no cadastro
- ❌ Matrícula não valida consentimento
- ❌ Consentimento só aparece na ficha do aluno (opcional)

#### Arquivos de referência
| Propósito | Caminho absoluto |
|-----------|------------------|
| Modelo de consentimento | `backend/apps/governance/models/privacy.py` |
| Serviço de privacidade | `backend/apps/governance/services/privacy_service.py` |
| Serviço de matrícula | `backend/apps/class_diary/services/enrollment_service.py` |
| API de alunos | `backend/apps/students/api/views.py` |
| Form de cadastro | `frontend/src/features/students/pages/StudentFormPage.tsx` |
| Form de matrícula | `frontend/src/features/classes/pages/EnrollmentFormPage.tsx` |
| Testes de matrícula | `backend/tests/class_diary/test_enrollments.py` |

#### Tipo de consentimento relevante
**`MATRICULA_USO_DADOS`** — uso de dados pessoais para fins de matrícula e gestão escolar (obrigatório)

`USO_IMAGEM` e `COMUNICACAO` permanecem **opcionais**.

#### Fluxo atual (2 passos separados)
1. Cadastro do aluno: `POST /api/v1/students/`
2. Matrícula em turma: `POST /api/v1/enrollments/` → `enroll_student_in_class()`

**Gap:** nenhum dos dois valida LGPD.

---

## 3. IMPLEMENTAÇÃO DETALHADA

### 3.1 GAP 1 — Histórico Escolar em PDF

#### BACKEND — Passo 1: Criar gerador de PDF

**Arquivo:** `backend/apps/reports/services/pdf_generator.py`

**Adicionar função:**
```python
def generate_school_history_pdf(student_id: int, user) -> BytesIO:
    """
    Gera PDF do histórico escolar do aluno.
    
    Args:
        student_id: ID do aluno
        user: Usuário solicitante (para auditoria)
    
    Returns:
        BytesIO: Buffer com PDF gerado
    
    Raises:
        ValidationError: Se aluno não existe ou usuário sem permissão
    """
    # 1. Buscar dados do aluno
    from apps.students.models import Student
    from apps.class_diary.models import Enrollment, Grade, SchoolHistory
    from apps.students.selectors.students import get_student_for_user
    
    student = get_student_for_user(user, student_id)
    if not student:
        raise ValidationError("Aluno não encontrado")
    
    # 2. Buscar matrícula ativa (ano letivo atual)
    enrollment = Enrollment.objects.filter(
        student=student,
        is_active=True
    ).select_related('school_class__school', 'school_class__grade_level').first()
    
    if not enrollment:
        raise ValidationError("Aluno sem matrícula ativa")
    
    # 3. Buscar notas e frequência
    grades = Grade.objects.filter(
        enrollment=enrollment
    ).select_related('subject').order_by('subject__name', 'period')
    
    # 4. Buscar histórico consolidado
    history = getattr(student, 'school_history', None)
    
    # 5. Configurar PDF (seguir padrão do boletim)
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40, leftMargin=40,
        topMargin=50, bottomMargin=50
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # 6. CABEÇALHO
    # TODO: Buscar logo/brasão da rede municipal
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Heading1'],
        alignment=TA_CENTER,
        fontSize=14,
        spaceAfter=20
    )
    
    story.append(Paragraph("SECRETARIA MUNICIPAL DE EDUCAÇÃO", header_style))
    story.append(Paragraph(enrollment.school_class.school.name, styles['Heading2']))
    story.append(Spacer(1, 20))
    story.append(Paragraph("<b>HISTÓRICO ESCOLAR</b>", header_style))
    story.append(Spacer(1, 20))
    
    # 7. DADOS DO ALUNO
    data_aluno = [
        ['Nome do aluno:', student.full_name],
        ['Data de nascimento:', student.birth_date.strftime('%d/%m/%Y')],
        ['CPF:', student.cpf or 'Não informado'],
        ['Matrícula:', enrollment.enrollment_number or student.unique_municipal_id],
        ['Escola:', enrollment.school_class.school.name],
        ['Série/Turma:', f"{enrollment.school_class.grade_level.name} - {enrollment.school_class.name}"],
        ['Ano letivo:', str(enrollment.academic_year or 'Atual')],
    ]
    
    table_aluno = Table(data_aluno, colWidths=[120, 350])
    table_aluno.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (1,0), (1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(table_aluno)
    story.append(Spacer(1, 20))
    
    # 8. DESEMPENHO ESCOLAR
    story.append(Paragraph("<b>Desempenho por Disciplina</b>", styles['Heading3']))
    story.append(Spacer(1, 10))
    
    # Agrupar notas por disciplina
    from collections import defaultdict
    notas_por_disciplina = defaultdict(list)
    for grade in grades:
        notas_por_disciplina[grade.subject].append(grade)
    
    data_notas = [['Disciplina', 'Carga Horária', '1º Bim', '2º Bim', '3º Bim', '4º Bim', 'Média']]
    
    for subject, subject_grades in notas_por_disciplina.items():
        row = [subject.name, f"{subject.workload}h"]
        
        # Notas por período (bimestre)
        periodos = {g.period: g.score for g in subject_grades}
        for i in range(1, 5):
            row.append(str(periodos.get(i, '-')))
        
        # Média da disciplina
        notas_validas = [g.score for g in subject_grades if g.score is not None]
        media = sum(notas_validas) / len(notas_validas) if notas_validas else 0
        row.append(f"{media:.1f}")
        
        data_notas.append(row)
    
    table_notas = Table(data_notas, colWidths=[150, 80, 50, 50, 50, 50, 50])
    table_notas.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.grey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(table_notas)
    story.append(Spacer(1, 20))
    
    # 9. FREQUÊNCIA
    if history:
        data_freq = [
            ['Total de aulas:', str(history.total_classes)],
            ['Faltas:', str(history.absences)],
            ['Frequência:', f"{history.attendance_percentage:.1f}%"],
        ]
        
        table_freq = Table(data_freq, colWidths=[150, 100])
        table_freq.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(Paragraph("<b>Frequência</b>", styles['Heading3']))
        story.append(Spacer(1, 10))
        story.append(table_freq)
        story.append(Spacer(1, 20))
    
    # 10. SITUAÇÃO FINAL
    if history:
        situacao_map = {
            'approved': 'APROVADO',
            'failed': 'REPROVADO',
            'pending': 'CURSANDO'
        }
        situacao = situacao_map.get(history.final_status, 'CURSANDO')
        
        story.append(Paragraph(
            f"<b>Situação Final:</b> {situacao}",
            styles['Heading3']
        ))
        story.append(Spacer(1, 30))
    
    # 11. CAMPOS DE ASSINATURA
    story.append(Spacer(1, 50))
    data_assinaturas = [
        ['_______________________________', '_______________________________'],
        ['Diretor(a) Escolar', 'Secretário(a) Escolar'],
    ]
    table_assinaturas = Table(data_assinaturas, colWidths=[230, 230])
    table_assinaturas.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,1), (-1,1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TOPPADDING', (0,1), (-1,1), 10),
    ]))
    story.append(table_assinaturas)
    
    # 12. RODAPÉ
    story.append(Spacer(1, 20))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER)
    story.append(Paragraph(
        f"Documento gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')}",
        footer_style
    ))
    
    # 13. Gerar PDF
    doc.build(story)
    buffer.seek(0)
    return buffer
```

**Imports necessários no topo do arquivo:**
```python
from datetime import datetime
from collections import defaultdict
```

---

#### BACKEND — Passo 2: Criar endpoint

**Arquivo:** `backend/apps/reports/api/views.py`

**Adicionar action no `ReportViewSet`:**
```python
@action(methods=['get'], detail=False, url_path='historico_pdf')
def historico_pdf(self, request):
    """
    Gera e retorna PDF do histórico escolar do aluno.
    
    Query params:
        - student_id (obrigatório): ID do aluno
    
    Returns:
        FileResponse: PDF inline
    
    Permissions:
        - SME: todos os alunos da rede
        - Escola: apenas alunos da própria escola
        - Responsável: apenas dependentes
    """
    student_id = request.query_params.get('student_id')
    
    if not student_id:
        return Response(
            {'error': 'Parâmetro student_id é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        student_id = int(student_id)
    except ValueError:
        return Response(
            {'error': 'student_id deve ser um número'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        pdf_buffer = generate_school_history_pdf(student_id, request.user)
        
        response = FileResponse(
            pdf_buffer,
            content_type='application/pdf'
        )
        response['Content-Disposition'] = f'inline; filename="historico_escolar_{student_id}.pdf"'
        
        return response
        
    except ValidationError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': 'Erro ao gerar histórico escolar'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

**Verificar imports:**
```python
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.response import Response
from django.http import FileResponse
from django.core.exceptions import ValidationError
from ..services.pdf_generator import generate_school_history_pdf
```

---

#### BACKEND — Passo 3: Testes

**Arquivo:** `backend/tests/reports/test_reports.py`

**Adicionar testes:**
```python
def test_historico_pdf_success(api_client, student_with_enrollment_and_grades):
    """Teste de geração bem-sucedida do histórico em PDF."""
    student = student_with_enrollment_and_grades
    
    # Autenticar como diretor da escola
    director = student.enrollment_set.first().school_class.school.director
    api_client.force_authenticate(user=director.user)
    
    url = reverse('report-historico-pdf')
    response = api_client.get(url, {'student_id': student.id})
    
    assert response.status_code == 200
    assert response['Content-Type'] == 'application/pdf'
    assert 'historico_escolar' in response['Content-Disposition']

def test_historico_pdf_missing_student_id(api_client, admin_user):
    """Teste de validação: student_id ausente."""
    api_client.force_authenticate(user=admin_user)
    
    url = reverse('report-historico-pdf')
    response = api_client.get(url)
    
    assert response.status_code == 400
    assert 'student_id é obrigatório' in response.data['error']

def test_historico_pdf_invalid_student_id(api_client, admin_user):
    """Teste de validação: student_id inválido."""
    api_client.force_authenticate(user=admin_user)
    
    url = reverse('report-historico-pdf')
    response = api_client.get(url, {'student_id': 'abc'})
    
    assert response.status_code == 400

def test_historico_pdf_student_not_found(api_client, admin_user):
    """Teste de validação: aluno não existe."""
    api_client.force_authenticate(user=admin_user)
    
    url = reverse('report-historico-pdf')
    response = api_client.get(url, {'student_id': 99999})
    
    assert response.status_code == 400
    assert 'não encontrado' in response.data['error'].lower()

def test_historico_pdf_permission_guardian(api_client, guardian_user, student):
    """Teste de permissão: responsável só acessa dependentes."""
    api_client.force_authenticate(user=guardian_user)
    
    url = reverse('report-historico-pdf')
    response = api_client.get(url, {'student_id': student.id})
    
    # Deve falhar se student não é dependente de guardian_user
    assert response.status_code in [400, 403]
```

**Fixture necessária (se não existir):**
```python
@pytest.fixture
def student_with_enrollment_and_grades(db, student_factory, enrollment_factory, grade_factory):
    """Cria aluno com matrícula e notas."""
    student = student_factory()
    enrollment = enrollment_factory(student=student, is_active=True)
    
    # Criar notas de exemplo
    for period in range(1, 5):
        grade_factory(enrollment=enrollment, period=period, score=7.5)
    
    return student
```

---

#### FRONTEND — Passo 4: Botão de download

**Arquivo:** `frontend/src/features/students/pages/StudentDetailPage.tsx`

**Localizar seção de ações/documentos** (provavelmente tem botões de boletim/carteirinha) e **adicionar:**

```tsx
import { downloadStudentReport } from '@/lib/api/reports';
import { FileText } from 'lucide-react';

// Dentro do componente, na seção de ações:
<Button
  variant="outline"
  size="sm"
  onClick={() => downloadStudentReport('historico_pdf', student.id)}
  disabled={isDownloading}
>
  <FileText className="mr-2 h-4 w-4" />
  Baixar histórico escolar
</Button>
```

**Se a função `downloadStudentReport` não existir, criar em `lib/api/reports.ts`:**

```typescript
export async function downloadStudentReport(
  reportType: 'boletim_pdf' | 'carteirinha_pdf' | 'historico_pdf',
  studentId: number
): Promise<void> {
  try {
    const response = await api.get(`/reports/${reportType}/`, {
      params: { student_id: studentId },
      responseType: 'blob',
    });

    // Criar download automático
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportType}_${studentId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(`Erro ao baixar ${reportType}:`, error);
    throw error;
  }
}
```

---

### 3.2 GAP 2 — Tela de Responsáveis

#### FRONTEND — Passo 1: Criar GuardiansListPage

**Arquivo:** `frontend/src/features/guardians/pages/GuardiansListPage.tsx`

**Criar novo arquivo:**
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Eye, UserX } from 'lucide-react';
import { useCrud } from '@/hooks/useCrud';
import { Guardian } from '@/types/api';
import { ROUTES } from '@/app/routes/paths';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScopeBar } from '@/components/layout/ScopeBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCPF, formatPhone } from '@/lib/utils';

export function GuardiansListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [guardianToDelete, setGuardianToDelete] = useState<Guardian | null>(null);

  const {
    items: guardians,
    isLoading,
    deleteItem,
  } = useCrud<Guardian>('guardians/', 'guardians', {
    filters: {
      is_active: showInactive ? undefined : true,
      search: searchTerm || undefined,
    },
  });

  const handleDelete = async (guardian: Guardian) => {
    await deleteItem(guardian.id);
    setGuardianToDelete(null);
  };

  const columns = [
    {
      header: 'Nome completo',
      accessorKey: 'full_name',
      cell: ({ row }: any) => (
        <div className="font-medium">{row.original.full_name}</div>
      ),
    },
    {
      header: 'CPF',
      accessorKey: 'cpf',
      cell: ({ row }: any) => formatCPF(row.original.cpf),
    },
    {
      header: 'Telefone',
      accessorKey: 'phone',
      cell: ({ row }: any) => formatPhone(row.original.phone),
    },
    {
      header: 'Email',
      accessorKey: 'email',
    },
    {
      header: 'Situação',
      accessorKey: 'is_active',
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_active ? 'success' : 'secondary'}>
          {row.original.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      header: 'Ações',
      cell: ({ row }: any) => {
        const guardian = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${ROUTES.guardians}/${guardian.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${ROUTES.guardians}/${guardian.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {guardian.is_active && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGuardianToDelete(guardian)}
              >
                <UserX className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Responsáveis"
        description="Gerencie o cadastro de responsáveis e vínculos com alunos"
      />

      <ScopeBar
        actions={
          <Button onClick={() => navigate(`${ROUTES.guardians}/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo responsável
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={guardians}
        isLoading={isLoading}
        emptyMessage="Nenhum responsável encontrado"
      />

      <ConfirmDialog
        open={!!guardianToDelete}
        onClose={() => setGuardianToDelete(null)}
        onConfirm={() => guardianToDelete && handleDelete(guardianToDelete)}
        title="Desativar responsável"
        description={`Tem certeza que deseja desativar ${guardianToDelete?.full_name}? O responsável não será excluído, apenas marcado como inativo.`}
        confirmText="Desativar"
        variant="destructive"
      />
    </div>
  );
}
```

---

#### FRONTEND — Passo 2: Criar GuardianFormPage

**Arquivo:** `frontend/src/features/guardians/pages/GuardianFormPage.tsx`

```tsx
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCrud } from '@/hooks/useCrud';
import { Guardian } from '@/types/api';
import { ROUTES } from '@/app/routes/paths';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { validateCPF } from '@/lib/validators';

const guardianSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string()
    .min(11, 'CPF inválido')
    .refine(validateCPF, 'CPF inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  occupation: z.string().optional(),
});

type GuardianFormData = z.infer<typeof guardianSchema>;

export function GuardianFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const {
    getItem,
    createItem,
    updateItem,
    isLoading,
  } = useCrud<Guardian>('guardians/', 'guardians');

  const form = useForm<GuardianFormData>({
    resolver: zodResolver(guardianSchema),
    defaultValues: {
      full_name: '',
      cpf: '',
      phone: '',
      email: '',
      address: '',
      occupation: '',
    },
  });

  useEffect(() => {
    if (isEditing && id) {
      getItem(parseInt(id)).then((guardian) => {
        if (guardian) {
          form.reset({
            full_name: guardian.full_name,
            cpf: guardian.cpf,
            phone: guardian.phone,
            email: guardian.email || '',
            address: guardian.address || '',
            occupation: guardian.occupation || '',
          });
        }
      });
    }
  }, [id, isEditing]);

  const onSubmit = async (data: GuardianFormData) => {
    try {
      if (isEditing && id) {
        await updateItem(parseInt(id), data);
      } else {
        await createItem(data);
      }
      navigate(ROUTES.guardians);
    } catch (error) {
      console.error('Erro ao salvar responsável:', error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? 'Editar responsável' : 'Novo responsável'}
        description="Preencha os dados cadastrais do responsável"
        backLink={ROUTES.guardians}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome completo do responsável" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(00) 00000-0000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="email@exemplo.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ocupação/Profissão</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Comerciante" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Rua, número, bairro, cidade, CEP"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.guardians)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isEditing ? 'Salvar alterações' : 'Cadastrar responsável'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
```

---

#### FRONTEND — Passo 3: Criar GuardianDetailPage

**Arquivo:** `frontend/src/features/guardians/pages/GuardianDetailPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCrud } from '@/hooks/useCrud';
import { Guardian, StudentGuardian } from '@/types/api';
import { ROUTES } from '@/app/routes/paths';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { formatCPF, formatPhone } from '@/lib/utils';
import { StudentLinkModal } from '../components/StudentLinkModal';

export function GuardianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const { getItem, isLoading } = useCrud<Guardian>('guardians/', 'guardians');
  
  const {
    items: links,
    deleteItem: deleteLink,
    refetch: refetchLinks,
  } = useCrud<StudentGuardian>('guardians/links/', 'guardian-links', {
    filters: { guardian: id },
  });

  useEffect(() => {
    if (id) {
      getItem(parseInt(id)).then(setGuardian);
    }
  }, [id]);

  const handleDeleteLink = async (linkId: number) => {
    if (confirm('Remover vínculo com este aluno?')) {
      await deleteLink(linkId);
      refetchLinks();
    }
  };

  const linkColumns = [
    {
      header: 'Aluno',
      accessorKey: 'student_name',
    },
    {
      header: 'Parentesco',
      accessorKey: 'kinship_type',
      cell: ({ row }: any) => {
        const kinshipMap: Record<string, string> = {
          MOTHER: 'Mãe',
          FATHER: 'Pai',
          LEGAL_GUARDIAN: 'Responsável legal',
          GRANDPARENT: 'Avô/Avó',
          OTHER: 'Outro',
        };
        return kinshipMap[row.original.kinship_type] || row.original.kinship_type;
      },
    },
    {
      header: 'Contato de emergência',
      accessorKey: 'is_emergency_contact',
      cell: ({ row }: any) => (
        row.original.is_emergency_contact ? (
          <Badge variant="success">Sim</Badge>
        ) : (
          <Badge variant="secondary">Não</Badge>
        )
      ),
    },
    {
      header: 'Ações',
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteLink(row.original.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (isLoading || !guardian) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={guardian.full_name}
        description="Ficha cadastral do responsável"
        backLink={ROUTES.guardians}
        actions={
          <Button onClick={() => navigate(`${ROUTES.guardians}/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">CPF</p>
            <p className="font-medium">{formatCPF(guardian.cpf)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Telefone</p>
            <p className="font-medium">{formatPhone(guardian.phone)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{guardian.email || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ocupação</p>
            <p className="font-medium">{guardian.occupation || 'Não informado'}</p>
          </div>
          {guardian.address && (
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium">{guardian.address}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Situação</p>
            <Badge variant={guardian.is_active ? 'success' : 'secondary'}>
              {guardian.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          {guardian.user && (
            <div>
              <p className="text-sm text-muted-foreground">Acesso ao portal</p>
              <Badge variant="success">Ativo</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Alunos vinculados</CardTitle>
          <Button onClick={() => setShowLinkModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar vínculo
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={linkColumns}
            data={links}
            emptyMessage="Nenhum aluno vinculado"
          />
        </CardContent>
      </Card>

      {showLinkModal && (
        <StudentLinkModal
          guardianId={parseInt(id!)}
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => {
            setShowLinkModal(false);
            refetchLinks();
          }}
        />
      )}
    </div>
  );
}
```

---

#### FRONTEND — Passo 4: Criar StudentLinkModal

**Arquivo:** `frontend/src/features/guardians/components/StudentLinkModal.tsx`

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCrud } from '@/hooks/useCrud';
import { Student, KinshipType } from '@/types/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const linkSchema = z.object({
  student: z.number({ required_error: 'Selecione um aluno' }),
  kinship_type: z.enum(['MOTHER', 'FATHER', 'LEGAL_GUARDIAN', 'GRANDPARENT', 'OTHER']),
  is_emergency_contact: z.boolean(),
});

type LinkFormData = z.infer<typeof linkSchema>;

interface StudentLinkModalProps {
  guardianId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function StudentLinkModal({ guardianId, onClose, onSuccess }: StudentLinkModalProps) {
  const { items: students } = useCrud<Student>('students/', 'students', {
    filters: { is_active: true },
  });
  
  const { createItem, isLoading } = useCrud('guardians/links/', 'guardian-links');

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      kinship_type: 'MOTHER',
      is_emergency_contact: false,
    },
  });

  const onSubmit = async (data: LinkFormData) => {
    try {
      await createItem({
        ...data,
        guardian: guardianId,
      });
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar vínculo:', error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar vínculo com aluno</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="student"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aluno *</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um aluno" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kinship_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parentesco *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MOTHER">Mãe</SelectItem>
                      <SelectItem value="FATHER">Pai</SelectItem>
                      <SelectItem value="LEGAL_GUARDIAN">Responsável legal</SelectItem>
                      <SelectItem value="GRANDPARENT">Avô/Avó</SelectItem>
                      <SelectItem value="OTHER">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_emergency_contact"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Contato de emergência</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                Adicionar vínculo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### FRONTEND — Passo 5: Atualizar tipos TypeScript

**Arquivo:** `frontend/src/types/api.ts`

**Atualizar tipo `KinshipType`:**
```typescript
export type KinshipType = 'MOTHER' | 'FATHER' | 'LEGAL_GUARDIAN' | 'GRANDPARENT' | 'OTHER';
```

**Atualizar tipo `Guardian`:**
```typescript
export interface Guardian {
  id: number;
  full_name: string;
  cpf: string;
  phone: string;
  email?: string;
  address?: string;        // ADICIONAR
  occupation?: string;     // ADICIONAR
  user?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

---

#### FRONTEND — Passo 6: Atualizar roteador

**Arquivo:** `frontend/src/app/routes/AppRoutes.tsx`

**Substituir placeholder:**
```tsx
import { GuardiansListPage } from '@/features/guardians/pages/GuardiansListPage';
import { GuardianFormPage } from '@/features/guardians/pages/GuardianFormPage';
import { GuardianDetailPage } from '@/features/guardians/pages/GuardianDetailPage';

// Dentro do <Routes>:

<Route
  path={ROUTES.guardians}
  element={guard(
    [...SME, ...SCHOOL_MGMT],
    <GuardiansListPage />
  )}
/>
<Route
  path={`${ROUTES.guardians}/new`}
  element={guard(
    [...SME, ...SCHOOL_MGMT],
    <GuardianFormPage />
  )}
/>
<Route
  path={`${ROUTES.guardians}/:id`}
  element={guard(
    [...SME, ...SCHOOL_MGMT],
    <GuardianDetailPage />
  )}
/>
<Route
  path={`${ROUTES.guardians}/:id/edit`}
  element={guard(
    [...SME, ...SCHOOL_MGMT],
    <GuardianFormPage />
  )}
/>
```

---

### 3.3 GAP 3 — LGPD Obrigatório

#### BACKEND — Passo 1: Validação no serviço de matrícula

**Arquivo:** `backend/apps/class_diary/services/enrollment_service.py`

**Modificar função `enroll_student_in_class`:**

Adicionar validação LGPD **antes** da criação da matrícula:

```python
from apps.governance.services.privacy_service import get_consent_status
from apps.governance.models.privacy import ConsentType

def enroll_student_in_class(
    student_id: int,
    school_class_id: int,
    enrollment_number: str = None,
    user=None
) -> Enrollment:
    """
    Matricula um aluno em uma turma.
    
    Valida:
    - Aluno e turma existem
    - Aluno não tem matrícula ativa no mesmo ano letivo
    - Capacidade da turma
    - CONSENTIMENTO LGPD (novo)
    
    Args:
        student_id: ID do aluno
        school_class_id: ID da turma
        enrollment_number: Número de matrícula (opcional, gera automático)
        user: Usuário que está matriculando
    
    Returns:
        Enrollment: Matrícula criada
    
    Raises:
        ValidationError: Se validação falhar
    """
    # 1. Buscar aluno e turma
    try:
        student = Student.objects.get(id=student_id, is_active=True)
    except Student.DoesNotExist:
        raise ValidationError("Aluno não encontrado ou inativo")
    
    try:
        school_class = SchoolClass.objects.select_related('school', 'academic_year').get(
            id=school_class_id,
            is_active=True
        )
    except SchoolClass.DoesNotExist:
        raise ValidationError("Turma não encontrada ou inativa")
    
    # 2. NOVO: Validar consentimento LGPD
    consent_status = get_consent_status(student, ConsentType.MATRICULA_USO_DADOS)
    
    if not consent_status or not consent_status.get('granted'):
        raise ValidationError(
            "Não é possível matricular o aluno sem o consentimento LGPD. "
            "O responsável deve aceitar os termos de uso de dados pessoais."
        )
    
    # 3. Validar matrícula duplicada no ano letivo
    existing_enrollment = Enrollment.objects.filter(
        student=student,
        school_class__academic_year=school_class.academic_year,
        is_active=True
    ).exists()
    
    if existing_enrollment:
        raise ValidationError(
            f"Aluno já possui matrícula ativa no ano letivo {school_class.academic_year}"
        )
    
    # 4. Validar capacidade da turma
    with transaction.atomic():
        school_class = SchoolClass.objects.select_for_update().get(id=school_class_id)
        
        current_enrollments = school_class.enrollments.filter(is_active=True).count()
        
        if school_class.max_students and current_enrollments >= school_class.max_students:
            raise ValidationError(
                f"Turma {school_class.name} está com lotação máxima "
                f"({school_class.max_students} alunos)"
            )
        
        # 5. Gerar número de matrícula se não fornecido
        if not enrollment_number:
            enrollment_number = generate_enrollment_number(student, school_class)
        
        # 6. Criar matrícula
        enrollment = Enrollment.objects.create(
            student=student,
            school_class=school_class,
            enrollment_number=enrollment_number,
            status='active',
            enrolled_by=user
        )
        
        return enrollment
```

**Imports necessários no topo:**
```python
from apps.governance.services.privacy_service import get_consent_status
from apps.governance.models.privacy import ConsentType
```

---

#### BACKEND — Passo 2: Endpoint de criação de aluno com LGPD

**Arquivo:** `backend/apps/students/api/views.py`

**Modificar `StudentViewSet.create()`:**

```python
from apps.governance.services.privacy_service import record_consent
from apps.governance.models.privacy import ConsentType

class StudentViewSet(viewsets.ModelViewSet):
    # ... código existente ...
    
    def create(self, request, *args, **kwargs):
        """
        Cria aluno e registra consentimento LGPD se fornecido.
        
        Payload adicional:
            - lgpd_consent (bool): Se true, cria ConsentRecord obrigatório
        """
        lgpd_consent = request.data.pop('lgpd_consent', None)
        
        # Validar que consentimento foi fornecido
        if lgpd_consent is None or lgpd_consent is False:
            return Response(
                {
                    'error': 'O aceite dos termos LGPD é obrigatório para cadastro de alunos. '
                             'Inclua lgpd_consent: true no payload.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Criar aluno
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        
        # Registrar consentimento LGPD
        if lgpd_consent:
            record_consent(
                student=student,
                user=request.user,
                consent_type=ConsentType.MATRICULA_USO_DADOS,
                granted=True,
                ip_address=self.get_client_ip(request)
            )
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def get_client_ip(self, request):
        """Extrai IP do cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
```

**Imports necessários:**
```python
from apps.governance.services.privacy_service import record_consent
from apps.governance.models.privacy import ConsentType
from rest_framework import status
from rest_framework.response import Response
```

---

#### BACKEND — Passo 3: Testes

**Arquivo:** `backend/tests/class_diary/test_enrollments.py`

**Adicionar testes:**
```python
import pytest
from apps.class_diary.services.enrollment_service import enroll_student_in_class
from apps.governance.services.privacy_service import record_consent
from apps.governance.models.privacy import ConsentType
from django.core.exceptions import ValidationError

@pytest.mark.django_db
def test_enrollment_requires_lgpd_consent(student, school_class, admin_user):
    """Matrícula sem consentimento LGPD deve falhar."""
    with pytest.raises(ValidationError) as exc_info:
        enroll_student_in_class(
            student_id=student.id,
            school_class_id=school_class.id,
            user=admin_user
        )
    
    assert 'consentimento LGPD' in str(exc_info.value).lower()

@pytest.mark.django_db
def test_enrollment_with_lgpd_consent_succeeds(student, school_class, admin_user):
    """Matrícula com consentimento LGPD deve ter sucesso."""
    # Registrar consentimento
    record_consent(
        student=student,
        user=admin_user,
        consent_type=ConsentType.MATRICULA_USO_DADOS,
        granted=True,
        ip_address='127.0.0.1'
    )
    
    # Matricular
    enrollment = enroll_student_in_class(
        student_id=student.id,
        school_class_id=school_class.id,
        user=admin_user
    )
    
    assert enrollment.student == student
    assert enrollment.school_class == school_class
    assert enrollment.is_active

@pytest.mark.django_db
def test_enrollment_with_denied_consent_fails(student, school_class, admin_user):
    """Matrícula com consentimento negado deve falhar."""
    # Registrar consentimento NEGADO
    record_consent(
        student=student,
        user=admin_user,
        consent_type=ConsentType.MATRICULA_USO_DADOS,
        granted=False,
        ip_address='127.0.0.1'
    )
    
    with pytest.raises(ValidationError) as exc_info:
        enroll_student_in_class(
            student_id=student.id,
            school_class_id=school_class.id,
            user=admin_user
        )
    
    assert 'consentimento' in str(exc_info.value).lower()
```

---

#### FRONTEND — Passo 4: Checkbox LGPD no cadastro de aluno

**Arquivo:** `frontend/src/features/students/pages/StudentFormPage.tsx`

**Atualizar schema Zod:**
```typescript
const studentSchema = z.object({
  // ... campos existentes ...
  
  // NOVO: campo obrigatório
  lgpd_consent: z.boolean().refine(
    (val) => val === true,
    "Você deve aceitar os termos de uso de dados pessoais para cadastrar o aluno"
  ),
});
```

**Adicionar campo no formulário:**
```tsx
import { Checkbox } from '@/components/ui/checkbox';
import { LGPDTermsModal } from '@/components/lgpd/LGPDTermsModal';

// Dentro do componente:
const [showTermsModal, setShowTermsModal] = useState(false);

// No formulário, antes dos botões de ação:
<FormField
  control={form.control}
  name="lgpd_consent"
  render={({ field }) => (
    <FormItem className="col-span-2 space-y-2 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <FormControl>
          <Checkbox
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        </FormControl>
        <div className="flex-1">
          <FormLabel className="text-sm font-normal">
            Li e aceito os{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-primary underline"
            >
              termos de uso de dados pessoais
            </button>{' '}
            para fins de matrícula e gestão escolar (versão 1.0) *
          </FormLabel>
          <FormMessage />
        </div>
      </div>
      <p className="text-xs text-muted-foreground ml-7">
        Este consentimento é obrigatório para cadastrar o aluno no sistema.
        Os dados serão utilizados exclusivamente para fins educacionais e
        cumprimento de obrigações legais (Lei 13.709/2018 - LGPD).
      </p>
    </FormItem>
  )}
/>

{showTermsModal && (
  <LGPDTermsModal onClose={() => setShowTermsModal(false)} />
)}
```

---

#### FRONTEND — Passo 5: Modal de termos LGPD

**Arquivo:** `frontend/src/components/lgpd/LGPDTermsModal.tsx`

**Criar novo arquivo:**
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LGPDTermsModalProps {
  onClose: () => void;
}

export function LGPDTermsModal({ onClose }: LGPDTermsModalProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Termos de Uso de Dados Pessoais - Versão 1.0</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Objeto do Consentimento</h3>
              <p className="text-muted-foreground">
                Este termo estabelece as condições para tratamento de dados pessoais do aluno
                pela Secretaria Municipal de Educação e unidades escolares da rede municipal,
                nos termos da Lei 13.709/2018 (Lei Geral de Proteção de Dados - LGPD).
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Dados Coletados</h3>
              <p className="text-muted-foreground">
                Serão coletados e tratados dados de identificação (nome, CPF, RG, data de nascimento),
                filiação, endereço, contatos de responsáveis, dados acadêmicos (notas, frequência,
                histórico escolar), dados de saúde necessários para atendimento educacional
                especializado, e documentos oficiais.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. Finalidades do Tratamento</h3>
              <p className="text-muted-foreground">
                Os dados serão utilizados exclusivamente para:
              </p>
              <ul className="list-disc pl-6 mt-2 text-muted-foreground space-y-1">
                <li>Efetuar matrícula e manter registro escolar</li>
                <li>Gestão acadêmica e acompanhamento pedagógico</li>
                <li>Emissão de documentos escolares (boletim, histórico, declarações)</li>
                <li>Cumprimento de obrigações legais (Censo Escolar, Educacenso)</li>
                <li>Comunicação com responsáveis sobre assuntos escolares</li>
                <li>Garantia de direitos educacionais e sociais do aluno</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Compartilhamento de Dados</h3>
              <p className="text-muted-foreground">
                Os dados poderão ser compartilhados com o Ministério da Educação (MEC/INEP)
                para fins de Censo Escolar, com órgãos de controle (Ministério Público, Tribunal
                de Contas) quando exigido por lei, e com prestadores de serviços sob contrato
                de confidencialidade.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Direitos do Titular</h3>
              <p className="text-muted-foreground">
                O responsável legal e o aluno (quando maior de idade) têm direito a:
              </p>
              <ul className="list-disc pl-6 mt-2 text-muted-foreground space-y-1">
                <li>Confirmar a existência de tratamento</li>
                <li>Acessar os dados</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar portabilidade dos dados</li>
                <li>Solicitar eliminação de dados (exceto aqueles de guarda obrigatória legal)</li>
                <li>Revogar o consentimento (com possível impossibilidade de continuidade da matrícula)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Armazenamento e Segurança</h3>
              <p className="text-muted-foreground">
                Os dados serão armazenados em sistema informatizado com medidas de segurança
                técnicas e administrativas, pelo prazo necessário ao cumprimento das finalidades
                educacionais e das obrigações legais de guarda (mínimo de 5 anos após conclusão
                ou transferência, conforme legislação educacional).
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Encarregado de Dados (DPO)</h3>
              <p className="text-muted-foreground">
                Para exercer seus direitos ou esclarecer dúvidas, o responsável legal pode
                contatar o Encarregado de Proteção de Dados da Secretaria Municipal de Educação
                através do e-mail: dpo@educacao.municipio.gov.br
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Consentimento</h3>
              <p className="text-muted-foreground">
                Ao aceitar estes termos, o responsável legal consente, de forma livre e informada,
                com o tratamento dos dados pessoais do aluno nos termos aqui descritos, ciente
                de que a recusa pode impossibilitar a matrícula e o acompanhamento escolar.
              </p>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### FRONTEND — Passo 6: Validação no formulário de matrícula

**Arquivo:** `frontend/src/features/classes/pages/EnrollmentFormPage.tsx`

**Adicionar validação:**

Se o aluno sendo matriculado for **recém-criado** (ID não existe ainda), o consentimento já foi coletado no cadastro.

Se for **aluno existente**, validar antes de permitir matrícula:

```tsx
import { api } from '@/lib/api';

// Adicionar verificação ao submeter:
const onSubmit = async (data: EnrollmentFormData) => {
  try {
    // Verificar se aluno tem consentimento LGPD
    const studentId = data.student;
    const consentResponse = await api.get(`/privacy/consents/`, {
      params: {
        student: studentId,
        consent_type: 'MATRICULA_USO_DADOS',
      },
    });
    
    const hasConsent = consentResponse.data.results?.some(
      (c: any) => c.granted === true
    );
    
    if (!hasConsent) {
      alert(
        'Este aluno não possui consentimento LGPD registrado. ' +
        'Por favor, colete o aceite dos termos antes de matricular.'
      );
      return;
    }
    
    // Prosseguir com matrícula
    await createItem(data);
    navigate(ROUTES.enrollments);
    
  } catch (error) {
    console.error('Erro ao matricular:', error);
  }
};
```

**Alternativa simplificada:** deixar a validação apenas no backend. O erro retornado já será suficientemente claro.

---

## 4. ORDEM DE EXECUÇÃO RECOMENDADA

### Semana 1 (5 dias úteis)

**Dia 1:** GAP 3 - LGPD Backend
- Modificar `enrollment_service.py` (validação obrigatória)
- Modificar `StudentViewSet.create()` (registro de consentimento)
- Escrever testes em `test_enrollments.py`
- Rodar testes: `pytest backend/tests/class_diary/test_enrollments.py -v`

**Dia 2:** GAP 3 - LGPD Frontend
- Criar `LGPDTermsModal.tsx`
- Modificar `StudentFormPage.tsx` (checkbox obrigatório)
- Atualizar schema Zod
- Testar fluxo completo localmente

**Dia 3:** GAP 1 - Histórico PDF Backend (Parte 1)
- Criar função `generate_school_history_pdf()` em `pdf_generator.py`
- Testar geração local com dados mockados

**Dia 4:** GAP 1 - Histórico PDF Backend (Parte 2)
- Adicionar action `historico_pdf` no `ReportViewSet`
- Escrever testes em `test_reports.py`
- Testar endpoint via Postman/curl

**Dia 5:** GAP 1 - Histórico PDF Frontend
- Adicionar botão "Baixar histórico" em `StudentDetailPage`
- Implementar/verificar `downloadStudentReport()`
- Testar download completo

### Semana 2 (5 dias úteis)

**Dia 1:** GAP 2 - Responsáveis (Estrutura)
- Criar estrutura de diretórios em `features/guardians/pages/`
- Atualizar tipos em `api.ts` (adicionar `OTHER`, `occupation`, `address`)
- Atualizar rotas em `AppRoutes.tsx`

**Dia 2-3:** GAP 2 - Responsáveis (List + Form)
- Criar `GuardiansListPage.tsx` (seguir padrão `StudentsListPage`)
- Criar `GuardianFormPage.tsx` (validação Zod, formatação)
- Testar CRUD básico

**Dia 4:** GAP 2 - Responsáveis (Detail + Links)
- Criar `GuardianDetailPage.tsx`
- Criar `StudentLinkModal.tsx`
- Implementar gestão de vínculos

**Dia 5:** GAP 2 - Responsáveis (Refinamentos)
- Ajustar estilos e responsividade
- Testar com dados realistas
- Validar permissões

### Semana 3 (2-3 dias úteis)

**Dia 1:** Testes E2E
- Playwright: fluxo de cadastro com LGPD
- Playwright: fluxo de matrícula (validação de consentimento)
- Vitest: componentes de responsáveis

**Dia 2:** Refinamentos finais
- Ajustar mensagens de erro
- Melhorar feedback visual
- Corrigir bugs encontrados

**Dia 3:** Validação completa
- Smoke test de todos os 3 gaps
- Preparar ambiente de demonstração
- Documentar fluxos para time comercial

**Total estimado:** 12-13 dias úteis (2,5 semanas)

---

## 5. CRITÉRIOS DE ACEITAÇÃO

### GAP 1 - Histórico Escolar em PDF

- [ ] Endpoint `GET /api/v1/reports/historico_pdf/?student_id=X` retorna PDF válido
- [ ] PDF contém: dados do aluno, escola, disciplinas, notas, frequência, situação final
- [ ] Layout profissional com cabeçalho da rede e campos de assinatura
- [ ] Botão "Baixar histórico" visível na ficha do aluno
- [ ] Download funciona e abre PDF corretamente
- [ ] Testes pytest passando (geração + validação + permissões)

### GAP 2 - Tela de Responsáveis

- [ ] Rota `/responsaveis` não é mais placeholder
- [ ] Lista mostra responsáveis com busca funcional (nome, CPF, email)
- [ ] Filtro de ativos/inativos funciona
- [ ] Formulário cria/edita responsáveis com validação (CPF, email, telefone)
- [ ] Página de detalhes mostra dados cadastrais
- [ ] Seção de vínculos lista alunos associados
- [ ] Modal de adicionar vínculo funciona (seleção de aluno + parentesco)
- [ ] Remoção de vínculo funciona com confirmação
- [ ] Soft-delete de responsável funciona
- [ ] Menu de navegação leva à tela funcional

### GAP 3 - LGPD Obrigatório

- [ ] Cadastro de aluno **exige** checkbox de aceite LGPD
- [ ] Tentativa de cadastrar sem aceitar exibe erro específico
- [ ] Checkbox tem link para modal de termos completos
- [ ] Modal de termos exibe texto da política versão 1.0
- [ ] Matrícula valida existência de consentimento `MATRICULA_USO_DADOS`
- [ ] Tentativa de matricular sem consentimento retorna erro 400 com mensagem clara
- [ ] `ConsentRecord` é criado automaticamente com:
  - `student`: ID correto
  - `user`: quem registrou
  - `consent_type`: MATRICULA_USO_DADOS
  - `granted`: true
  - `term_version`: '1.0'
  - `ip_address`: IP do cliente
- [ ] Testes pytest passando (com/sem consentimento)
- [ ] Testes E2E Playwright passando (fluxo completo)

---

## 6. RISCOS E MITIGAÇÕES

### Risco 1: Histórico multi-ano
**Descrição:** Se secretarias exigirem histórico de múltiplos anos letivos, o modelo `SchoolHistory` atual (OneToOne) não suporta.

**Mitigação:** Para MVP pré-venda, gerar apenas do ano letivo atual. Documentar como "histórico do ano corrente" nas demos. Refatoração para multi-ano fica para pós-venda/customizações.

### Risco 2: Layout oficial do histórico
**Descrição:** Cada secretaria pode ter exigências específicas (brasão, carimbos, assinaturas digitais).

**Mitigação:** Implementar layout genérico profissional. Mencionar nas demos que o layout é customizável por município. Customizações ficam no catálogo de evoluções (S/M).

### Risco 3: Vínculos complexos de responsáveis
**Descrição:** Responsáveis com muitos filhos em várias escolas podem complicar a UI.

**Mitigação:** Testar com dados realistas (responsável com 3-4 filhos) durante desenvolvimento. Adicionar paginação na tabela de vínculos se necessário.

### Risco 4: Texto dos termos LGPD
**Descrição:** Texto legal pode precisar revisão jurídica.

**Mitigação:** Implementar com texto genérico baseado na LGPD. Deixar claro que é modelo, e que cada município deve adaptar conforme orientação jurídica própria.

### Risco 5: Revogação de consentimento
**Descrição:** LGPD permite revogação. O que acontece com matrícula ativa?

**Mitigação:** Para MVP, não implementar revogação automática (complexidade alta). Documentar que revogação deve ser tratada manualmente pela secretaria (possível desligamento do aluno). Funcionalidade completa de revogação fica para pós-venda.

---

## 7. DEPENDÊNCIAS TÉCNICAS

### Backend
- ✅ Django 6.1 + DRF 3.18
- ✅ ReportLab 5.0.1 (já instalado)
- ✅ PostgreSQL 16
- ✅ pytest + pytest-django

**Nenhuma nova dependência necessária.**

### Frontend
- ✅ React 18 + TypeScript
- ✅ TanStack Query (React Query)
- ✅ React Hook Form + Zod
- ✅ Tailwind CSS
- ✅ Axios

**Nenhuma nova dependência necessária.**

### Não há bloqueios entre os 3 gaps
Cada item pode ser desenvolvido **independentemente** e em **paralelo** por desenvolvedores diferentes.

---

## 8. TESTES NECESSÁRIOS

### Backend (pytest)
- ✅ `test_historico_pdf_success` — geração bem-sucedida
- ✅ `test_historico_pdf_missing_student_id` — validação de parâmetro
- ✅ `test_historico_pdf_student_not_found` — aluno inexistente
- ✅ `test_historico_pdf_permission_guardian` — permissões
- ✅ `test_enrollment_requires_lgpd_consent` — matrícula sem LGPD falha
- ✅ `test_enrollment_with_lgpd_consent_succeeds` — matrícula com LGPD ok
- ✅ `test_enrollment_with_denied_consent_fails` — consentimento negado

### Frontend (Vitest + Testing Library)
- ✅ Renderização de `GuardiansListPage`
- ✅ Busca e filtros de responsáveis
- ✅ Validação de formulário de responsável (CPF, email)
- ✅ Renderização de modal de vínculos

### E2E (Playwright)
- ✅ Fluxo completo: cadastro de aluno COM aceite LGPD → matrícula → sucesso
- ✅ Fluxo negativo: cadastro sem aceite LGPD → erro bloqueante
- ✅ Fluxo de CRUD de responsável: criar → editar → adicionar vínculo → desativar
- ✅ Download de histórico escolar em PDF → verificar arquivo baixado

---

## 9. COMANDOS ÚTEIS

### Backend
```bash
# Rodar servidor de desenvolvimento
cd backend
python manage.py runserver

# Rodar testes específicos
pytest backend/tests/reports/test_reports.py::test_historico_pdf_success -v
pytest backend/tests/class_diary/test_enrollments.py -v

# Criar migration (se necessário)
python manage.py makemigrations

# Rodar linter
ruff check apps/
black apps/ --check

# Verificar tipos
mypy apps/
```

### Frontend
```bash
# Rodar servidor de desenvolvimento
cd frontend
npm run dev

# Rodar testes unitários
npm run test

# Rodar testes E2E
npm run test:e2e

# Build de produção
npm run build

# Linter
npm run lint
```

### Docker
```bash
# Subir ambiente completo
docker-compose up -d

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rodar testes no container
docker-compose exec backend pytest

# Resetar banco (cuidado!)
docker-compose down -v
docker-compose up -d
```

---

## 10. CHECKLIST DE ENTREGA

### Antes de iniciar
- [ ] Criar branch `feat/gaps-criticos-pre-venda` a partir de `main`
- [ ] Verificar que ambiente de desenvolvimento está funcionando
- [ ] Confirmar que testes existentes estão passando

### Durante desenvolvimento
- [ ] Fazer commits atômicos e descritivos
- [ ] Escrever testes conforme implementa (TDD)
- [ ] Manter código formatado (black, ruff, prettier)
- [ ] Testar manualmente cada funcionalidade
- [ ] Documentar decisões importantes em comentários

### Antes de finalizar
- [ ] Todos os testes passando (backend + frontend + E2E)
- [ ] Linters sem erros
- [ ] Funcionalidades testadas em ambiente local
- [ ] Critérios de aceitação validados
- [ ] README atualizado (se necessário)
- [ ] Screenshots/GIFs de demonstração capturados

### Entrega
- [ ] Pull Request criado com descrição detalhada
- [ ] Code review solicitado
- [ ] CI/CD passando (GitHub Actions)
- [ ] Deploy em ambiente de staging para validação comercial
- [ ] Treinamento do time comercial agendado

---

## 11. CONTATOS E SUPORTE

**Dúvidas técnicas sobre o código:**
- Consultar documentação em `.docs/`
- Verificar issues/PRs anteriores no repositório
- Consultar CLAUDE.md (configuração de agentes especializados)

**Dúvidas sobre requisitos comerciais:**
- Revisar `comercial/Diagnostico_Prontidao_Producao_Minima.pdf`
- Consultar `comercial/Proposta_Comercial_SGE_Municipal.pdf`

**Arquitetura e decisões de design:**
- `.docs/DESIGN_DOC_GESTAO_MUNICIPAL_SME.md`
- `.docs/DESIGN_SYSTEM_REDE.md`

---

## 12. OBSERVAÇÕES FINAIS

### Qualidade é prioridade
Estes 3 gaps são **críticos para demonstração comercial**. A implementação deve ter:
- ✅ Código limpo e bem testado
- ✅ UI profissional e consistente
- ✅ Mensagens de erro claras
- ✅ Performance adequada (PDFs em < 2s)

### Seguir padrões existentes
- Histórico PDF → seguir `generate_boletim_pdf()`
- Tela de Responsáveis → seguir `StudentsListPage`
- Validações → seguir padrão do código atual

### Foco no MVP
- Não adicionar funcionalidades extras não solicitadas
- Histórico: apenas ano letivo atual
- LGPD: apenas `MATRICULA_USO_DADOS` obrigatório
- Responsáveis: CRUD básico funcional

### Comunicação
Se encontrar bloqueio técnico ou ambiguidade nos requisitos, **pause e pergunte** antes de improvisar soluções.

---

**BOA IMPLEMENTAÇÃO!**

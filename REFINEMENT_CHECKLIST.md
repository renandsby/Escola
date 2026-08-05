# Sistema de Gestão Escolar - Checklist de Refinamento

## 🔍 Verificação de Funcionalidades

### ✅ Backend - APIs REST

- [ ] GET /api/v1/schools/
- [ ] POST /api/v1/schools/ (criar)
- [ ] PUT /api/v1/schools/{id}/ (editar)
- [ ] DELETE /api/v1/schools/{id}/
- [ ] GET /api/v1/students/
- [ ] GET /api/v1/students/{id}/
- [ ] GET /api/v1/classes/
- [ ] GET /api/v1/subjects/
- [ ] GET /api/v1/grades/ (com filtros)
- [ ] GET /api/v1/attendance/ (com filtros)
- [ ] GET /api/v1/enrollments/
- [ ] GET /api/v1/guardians/
- [ ] GET /api/v1/accounts/users/me/ (perfil autenticado)
- [ ] GET /api/v1/reports/boletim_pdf/
- [ ] GET /api/v1/reports/carteirinha_pdf/
- [ ] GET /api/v1/reports/relatorio_excel/
- [ ] GET /api/v1/reports/relatorio_csv/

### 📱 Frontend - Páginas

- [ ] Login funciona para todos os roles
- [ ] Dashboard mostra dados corretos
- [ ] /schools - Listar, criar, editar, deletar
- [ ] /students - Listar, buscar por nome/matrícula
- [ ] /students/{id} - Boletim individual com gráficos
- [ ] /classes - Listar turmas
- [ ] /subjects - Listar disciplinas
- [ ] /grades - Listar notas com média
- [ ] /attendance - Listar frequência
- [ ] /boletins - Relatório consolidado
- [ ] /teacher-dashboard - Dashboard do professor
- [ ] /messages - Listar mensagens
- [ ] /documents - Upload/download de documentos

### 🔐 Autenticação & Permissões

- [ ] JWT tokens funcionam
- [ ] Refresh token funciona
- [ ] Usuários sem autenticação redirecionados para login
- [ ] Admin pode ver tudo
- [ ] Professor pode ver apenas suas turmas
- [ ] Aluno pode ver apenas seus dados
- [ ] Diretor pode ver escola inteira

### 📊 Dados & Relacionamentos

- [ ] Alunos vinculados a turmas
- [ ] Notas vinculadas a alunos/disciplinas/turmas
- [ ] Frequência vinculada corretamente
- [ ] Cálculo de média automático
- [ ] Cálculo de frequência %
- [ ] Status (aprovado/reprovado/pendente) correto

### 🐛 Tratamento de Erros

- [ ] Mensagens de erro claras
- [ ] Validações de formulário funcionam
- [ ] Campos obrigatórios não permitem vazios
- [ ] Erros de API mostram corretamente
- [ ] 404 quando recurso não existe
- [ ] 401 quando não autenticado
- [ ] 403 quando sem permissão

### ⚡ Performance & UX

- [ ] Páginas carregam rapidamente (<2s)
- [ ] Busca funciona em tempo real
- [ ] Paginação funciona (se houver)
- [ ] Spinner de loading mostra enquanto carrega
- [ ] Botões disabled durante ações

### 📝 Relatórios

- [ ] PDF boletim gera sem erros
- [ ] PDF carteirinha gera com QR Code
- [ ] Excel exporta com formatação
- [ ] CSV exporta dados estruturados
- [ ] Nomes de arquivos corretos

---

## 🔧 Tarefas de Refinamento

### Priority 1 (Crítico - Deve funcionar)
1. Verificar autenticação em todas as páginas
2. Testar CRUD completo para schools e students
3. Verificar se notas calculam corretamente
4. Testar PDFs

### Priority 2 (Alta - Melhorar UX)
1. Melhorar mensagens de erro
2. Adicionar loading spinners
3. Validar formulários melhor
4. Adicionar confirmação em deletar

### Priority 3 (Média - Polish)
1. Melhorar design responsivo
2. Adicionar animações suaves
3. Otimizar performance
4. Adicionar toast notifications

---

## 📋 Testes a Executar

### Teste 1: Login com diferentes roles
```
Aluno1 -> Ver boletim, notas, frequência
Professor1 -> Ver turmas, lançar notas
Diretor -> Ver escola toda
Admin -> Ver tudo
```

### Teste 2: CRUD Completo Schools
```
1. Listar escolas (GET)
2. Criar escola (POST)
3. Editar escola (PUT)
4. Deletar escola (DELETE)
```

### Teste 3: Filtros e Busca
```
1. Buscar aluno por nome
2. Buscar aluno por matrícula
3. Filtrar notas por aluno
4. Filtrar frequência por data
```

### Teste 4: Relatórios
```
1. Gerar PDF boletim
2. Gerar PDF carteirinha
3. Exportar Excel
4. Exportar CSV
```

---

## 📝 Bugs Encontrados

### Reportados:
- [ ] [Descrever bug encontrado]

### Corrigidos:
- [x] API baseURL não estava usando /api/v1
- [x] Grade não tinha atributo average (usar get_average())

---

*Última atualização: 2026-07-09*

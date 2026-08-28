# Design System "Rede" — Relatório de Execução

Aplicação da especificação `.docs/DESIGN_SYSTEM_REDE.md` ao frontend
(`frontend/src`). Ordem seguida: **tokens → casca → feedback → páginas**.

Estado atual: `npx tsc --noEmit` limpo · `npm run build` OK · `npm run lint`
0 erros (5 warnings pré-existentes em `useCrud.ts` e `types/index.ts`) ·
`npx vitest run` 7/7 · build publicado no container `escola_frontend`.

> **Não commitado.** Aguarda autorização explícita.

---

## Fase 1 — Tokens

| Entrega | Arquivo | Observação |
|---|---|---|
| Config Tailwind pronto para colar | `frontend/tailwind.config.ts` | Substitui `tailwind.config.js`. `theme.extend` com paletas `brand/ink/surface/line` e `ok/warn/danger/qual` (`fg/base/bg/border`); `fontFamily` Public Sans + IBM Plex Mono; escala fechada `page…micro` **estendida** (não substituída) para não quebrar telas ainda não refatoradas; `height.control=44px`, `height.row=44px`, `maxWidth.content=1180px`, `borderRadius` 6/10/pill, `boxShadow.overlay/sticky`. |
| Base CSS | `frontend/src/index.css` | Import Google Fonts, `@layer base` com tokens no `body`, `:focus-visible` com halo duplo (branco + brand), `tabular-nums` em `th/td/input[number]/.num`. |

**Desvio documentado:** a escala `spacing`/`fontSize`/`borderRadius` do spec é
_fechada_; adotamos **extensão** em vez de substituição para permitir rollout
incremental. Cabeçalho do `tailwind.config.ts` registra o desvio.

---

## Fase 2 — Casca (shell) e primitivos

### Primitivos — assinaturas e tabela estado → classes

| Primitivo | Arquivo | Assinatura | Estados |
|---|---|---|---|
| `Button` | `components/ui/Button.tsx` | `{ variant?: 'primary'\|'secondary'\|'danger'\|'ghost'; size?: 'md'\|'sm'; loading?; iconLeft? } & ButtonHTMLAttributes` (+ aliases legados `default/outline/destructive`, `lg/icon`) | primary `bg-brand-600→hover:bg-brand-700`; secondary `bg-white border-line-strong→hover:bg-surface-subtle`; danger `border-danger-border text-danger-fg→hover:bg-danger-bg`; ghost `bg-transparent→hover:bg-surface-subtle`; `disabled:opacity-45`; `loading`→spinner + `disabled` |
| `Field` + `Input/Select/Textarea/Checkbox/SegmentedControl` | `components/ui/Field.tsx` | `Field({ label, name, required?, help?, error?, mono?, className })` — controles herdam `name/erro/mono` via contexto; erro resolvido de `useFormContext()` | base `h-control border-line-strong`; `focus:ring-[3px] ring-brand-400/35`; erro `border-danger-base bg-danger-bg/40`; `read-only/disabled:bg-surface-subtle` |
| `Badge` | `components/ui/Badge.tsx` | `{ tone: 'brand'\|'ok'\|'warn'\|'danger'\|'qual'\|'neutral'; shape?: 'dot'\|'square'\|'diamond' }` | cor **+ forma** do marcador (nunca só cor) — `dot` pill, `square`, `diamond` rotate-45 |
| `DataTable` | `components/ui/DataTable.tsx` | `{ columns: Column<T>[]; rows; rowKey; onRowClick?; rowActions?; isLoading?; empty?; pagination? }` — `Column = { key, header, align?, mono?, width?, render }` | `isLoading`→`TableSkeleton`; `rows=[]`+`empty`→EmptyState; linha `h-row`, hover `bg-surface-hover`; `rowActions` `opacity-0 group-hover:opacity-100`; rodapé "de–a de total" `tabular-nums` |
| `PageHeader` | `components/ui/PageHeader.tsx` | `{ breadcrumb?; title; meta?; actions?; tabs?; activeTab? }` | `h1 text-page`; aba ativa `border-brand-600 text-brand-700` |
| `ScopeBar` + `useScope()` | `components/ui/ScopeBar.tsx` | `{ level: 'network'\|'school'\|'class'; title; detail?; onChangePeriod? }` — `useScope()` deriva `level` do `role` | network `bg-brand-50 border-brand-200`; school/class `bg-surface-subtle` |
| `EmptyState` | `components/ui/EmptyState.tsx` | `{ title; description; actions? }` | `border-dashed border-line-strong` |
| `InlineError` | `components/ui/InlineError.tsx` | `{ code?; title; message; actions? }` | `border-danger-border bg-danger-bg`; `code` em `font-mono text-[10.5px]` |
| `TableSkeleton` | `components/ui/TableSkeleton.tsx` | `{ rows=8; cols=4 }` | barras `animate-pulse` |
| `FormSection` + `StickyActions` | `components/ui/FormSection.tsx` | `FormSection({ title, description?, first?, className })` grid `[200px_1fr]`; `StickyActions({ pending? })` | seção sem borda quando `first`; barra `sticky bottom-0 shadow-sticky` |
| `BatchGrid` | `features/class-diary/components/BatchGrid.tsx` | `{ rows; rowKey; rowLabel; columns: BatchColumn<Row>[]; values; baseline; onChange; onSave; onCancel?; saving?; isLoading?; deadline?; bulkActions? }` | célula `pristine\|dirty\|invalid\|saved`; navegação por setas/Enter entre inputs numéricos; guarda `beforeunload` quando há alteração; contador de pendências + inválidas; `StickyActions` com Salvar desabilitado se `dirty=0` ou `invalid>0` |
| `TransferTimeline` | `features/students/components/TransferTimeline.tsx` | `{ status: string }` | stepper 4 passos (Solicitada → Aguardando SME → Aceite do destino → Nova matrícula); `REJECTED/CANCELLED` → selo `danger` |

### Casca

| Item | Arquivo |
|---|---|
| Shell com sidebar 280px + drawer mobile, `max-w-content`, TopBar | `components/layout/AppShell.tsx` |
| Sidebar por papel, badges de pendência | `components/layout/Sidebar.tsx` + `components/layout/navigation.ts` |
| Busca global (`/` foca, Enter → alunos) | `components/layout/TopBar.tsx` |
| Rotas em português + `LEGACY_REDIRECTS` | `app/routes/paths.ts` · `app/routes/AppRoutes.tsx` |

### Mapas (spec Fase 2)

| Arquivo | Cobre |
|---|---|
| `components/ui/statusMaps.ts` | `ENROLLMENT_STATUS`, `TRANSFER_STATUS`, `EVALUATION_TYPE`, `STAGE_TYPE`, `ACADEMIC_YEAR_STATUS`, `SHIFT`, `SCHOOL_TYPE`, `ATTENDANCE_STATUS`, `SCHOOL_HISTORY_STATUS`, `KINSHIP_TYPE`, `GENDER`, `RACE_COLOR`, `USER_ROLE` + `labelOf()` |
| `services/errorMessages.ts` | `error.code` do envelope: `DUPLICATE_ENROLLMENT`, `CLASS_CAPACITY_EXCEEDED`, `TEACHER_SCHEDULE_CONFLICT`, `DUPLICATE_ALLOCATION`, `INVALID_STATUS_TRANSITION`, `DESTINATION_SCHOOL_REQUIRED`, `NOT_DESTINATION_SCHOOL`, `*_NOT_FOUND`, `VALIDATION_ERROR`, HTTP 401/403/404/500 + fallback |
| `components/layout/navigation.ts` | 6 grupos, filtro `navForRole(role)` |

---

## Fase 3 — Feedback

| Item | Arquivo |
|---|---|
| `error.code` → `InlineError` com ação | `components/feedback/FormError.tsx` |
| Busca-antes-de-criar (P2) | `components/feedback/PersonLookupStep.tsx` |
| Página em construção | `components/feedback/PlaceholderPage.tsx` |
| Toast de rede offline | `services/api.ts` |
| `getErrorCode()` / `getErrorDetails()` | `utils/api-helpers.ts` |

---

## Fase 4 — Refatoração tela por tela

| Tela | Rota | Antes | Depois | Padrões aplicados |
|---|---|---|---|---|
| Painel do dia | `/` | cards hardcoded "—" | ✅ | PageHeader · ScopeBar · "Precisa de você" / "A rede hoje" · EmptyState (sem microdados Censo) |
| Escolas (lista) | `/escolas` | tabela ad-hoc | ✅ | PageHeader · ScopeBar · DataTable · busca · EmptyState |
| Escola (form) | `/escolas/nova`,`/:id/editar` | inputs inline | ✅ | FormProvider · FormSection (Identificação/Endereço/Contato) · StickyActions · FormError |
| Secretaria | `/` (SME) | tabela ad-hoc | ✅ | PageHeader · ScopeBar · ficha `dl` · DataTable escolas |
| Currículo — disciplinas | `/curriculo` | tabela ad-hoc | ✅ | PageHeader tabs · DataTable · busca |
| Currículo — matrizes | `/curriculo/matrizes` | tabela ad-hoc | ✅ | PageHeader tabs · DataTable · Badge |
| Disciplina (form) | `/curriculo/disciplinas/nova` | inputs inline | ✅ | FormProvider · FormSection · StickyActions |
| Turmas (lista) | `/turmas` | tabela ad-hoc | ✅ | DataTable · ScopeBar |
| Professores (lista) | `/professores` | tabela ad-hoc | ✅ | PageHeader tabs · DataTable · Badge situação |
| Professor (form) | `/professores/novo`,`/:id/editar` | dois forms inline | ✅ | PersonLookupStep (busca-antes-de-criar) · FormSection · StickyActions · FormError |
| Alocações | `/professores/alocacoes` | form + tabela ad-hoc | ✅ | PageHeader tabs · Field · DataTable · Badge regência |
| Alunos (lista) | `/alunos` | tabela ad-hoc | ✅ | DataTable · lê `?q=` da busca global · EmptyState |
| Aluno (form) | `/alunos/novo`,`/:id/editar` | grid inline 2col | ✅ | PersonLookupStep · FormSection (Identificação/Filiação/Documentos/AEE) · checkbox AEE revela detalhamento |
| Aluno (ficha) | `/alunos/:id` | cards + charts soltos | ✅ | PageHeader · ScopeBar · métricas · ficha `dl` · DataTable notas · charts recharts em cartão DS |
| Matrículas (lista) | `/matriculas` | tabela ad-hoc | ✅ | DataTable · Badge status · ação de troca de status |
| Matrícula (form) | `/matriculas/nova` | selects inline | ✅ | FormProvider · FormSection · StickyActions |
| Transferências | `/transferencias` | tabela + form ad-hoc | ✅ | lista em cartões com **TransferTimeline** · form Field · ConfirmDialog autorizar/aceitar |
| Diário — notas | `/diario/lancamentos` | planilha inline | ✅ | PageHeader tabs · **BatchGrid** numérico (nav por teclado, dirty/saved, guarda de saída) · `grades/batch-upsert/` |
| Diário — frequência | `/diario/frequencia` | botões inline | ✅ | PageHeader tabs · **BatchGrid** segmentado · "Marcar todos presentes" · `attendance/batch-upsert/` |
| Diário — pareceres | `/diario/pareceres` | form + tabela ad-hoc | ✅ | PageHeader tabs · Badge `qual` (diamond) · Field · DataTable |
| Diário — conteúdo | `/diario/conteudo` | — | ⏳ | PlaceholderPage (sem modelo no backend) |
| Documentos (lista) | `/documentos/arquivos` | tabela ad-hoc | ✅ | DataTable · busca · ConfirmDialog |
| Documento (detalhe) | `/documentos/arquivos/:id` | grid inline | ✅ | PageHeader · ficha `dl` · ação Baixar |
| Boletins | `/documentos/boletins` | tabela ad-hoc | ✅ | PageHeader · ScopeBar · Field turma · DataTable · média `ok/danger` |
| Exportações | `/documentos/exportacoes` | — | ⏳ | PlaceholderPage |
| Mensagens (lista) | `/mensagens` | tabela ad-hoc | ✅ | DataTable · Badge lida/nova · ConfirmDialog |
| Mensagem (ver/nova) | `/mensagens/nova`,`/:id` | grid inline | ✅ | PageHeader · leitura em cartão · form Field/FormSection/StickyActions |
| Configurações | `/configuracoes` | toggles azul-500 | ✅ | cartões DS · `Toggle` com `brand-600` · zona de perigo `danger` · ConfirmDialog logout |
| Login | `/login` | form azul-600 ad-hoc | ✅ | Field/Input · Button `loading` · InlineError · `shadow-overlay` |
| Ano letivo · Responsáveis | `/ano-letivo`,`/responsaveis` | — | ⏳ | PlaceholderPage / DepartmentPage |

Legenda: ✅ refatorado · ⏳ placeholder (sem dado no backend).

Removido: `pages/dashboard/TeacherDashboard.tsx` (código morto pós-reestruturação
FSD — CSS do bundle caiu de 21,6 kB → 18,1 kB).

---

## Fase — Checklist de conclusão (binário)

- [x] `tailwind.config.ts` com tokens do spec, pronto para colar
- [x] `index.css` com base tokens + `:focus-visible` + `tabular-nums`
- [x] `Button` — variantes, `loading`, `iconLeft`, aliases legados
- [x] `Field` + controles — erro via RHF, `mono`, estados
- [x] `Badge` — cor **+ forma**
- [x] `DataTable` — colunas tipadas, loading, empty, rowActions, paginação
- [x] `PageHeader` — breadcrumb, meta, actions, tabs
- [x] `ScopeBar` + `useScope()` por papel
- [x] `EmptyState`, `InlineError`, `TableSkeleton`, `FormSection`/`StickyActions`
- [x] `statusMaps.ts` — todos os enums do backend
- [x] `errorMessages.ts` — todos os `error.code` do envelope
- [x] `navigation.ts` — filtro por papel, grupos
- [x] Padrão: formulário seccionado (`SchoolFormPage`, `StudentFormPage`, …)
- [x] Padrão: busca-antes-de-criar (`PersonLookupStep` em professor e aluno)
- [x] Padrão: BatchGrid de lançamento em lote (notas + frequência)
- [x] Padrão: stepper de transferência (`TransferTimeline`)
- [x] Padrão: "Painel do dia" (`DashboardPage`)
- [x] Tabela de refatoração tela por tela (acima)
- [x] `tsc --noEmit` limpo
- [x] `npm run build` OK
- [x] `npm run lint` 0 erros
- [x] `npx vitest run` verde
- [x] Build publicado no container
- [ ] **Commit** — pendente de autorização
- [ ] Telas `⏳` — dependem de modelos no backend (conteúdo de aula, exportações, ano letivo, responsáveis)

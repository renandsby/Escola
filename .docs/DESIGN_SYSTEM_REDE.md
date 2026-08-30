# Design System "Rede" — Regras de Design

> **Status:** implantado. Toda a camada de apresentação do frontend
> (`src/components/**`, `src/app/routes`, layout) e todas as páginas com dados no
> backend já consomem estes primitivos.
>
> **Para que serve este documento:** é a referência obrigatória para **novas
> telas e novos componentes**. Antes de escrever UI, confira aqui os tokens, as
> assinaturas dos primitivos e os padrões de página. Contratos de API, hooks e
> schemas Zod não são assunto deste documento.
>
> **Stack:** React 18 + TypeScript strict · Vite 5 · Tailwind CSS 3 · TanStack
> Query v5 · Zustand · React Hook Form + Zod · sonner · arquitetura
> *Feature-Sliced* (`src/features/<domínio>/`, `src/components/{ui,layout,feedback}/`, `src/app/`).
>
> Referência visual: `Design System SME.dc.html`.
>
> **Revisão desta versão (casca):** a identidade do usuário migrou da `Sidebar`
> para um `AppHeader` institucional de 76px; a `Sidebar` passou a ser recolhível
> (268px ⇄ 68px); a `TopBar` de busca global foi **removida**. Ver §4.1.

---

## 1. Princípios que decidem dúvidas de implementação

Quando houver ambiguidade, resolva pelo princípio de menor número.

1. **P1 — Escopo sempre declarado.** Toda página que **exibe dados filtrados por
   RBAC** (rede / escola / turma) renderiza `<ScopeBar>` logo abaixo do
   `<PageHeader>`. Formulários de criação, o login, as configurações e a caixa de
   mensagens pessoal estão fora da regra (não "exibem" um recorte de escopo).
2. **P2 — O aluno é a chave.** Fluxos de criação de pessoa (aluno, responsável,
   professor) começam por busca no cadastro único, nunca por formulário vazio.
3. **P3 — Lote é o caso normal.** Notas, frequência e pareceres usam grade
   editável com salvamento em bloco (`batch-upsert`), navegação por teclado e
   estado por linha.
4. **P4 — Densidade com hierarquia.** Listas > cards. Linha de tabela 44px,
   tipografia sóbria, `tabular-nums` em qualquer número. Proibido card decorativo
   com ícone colorido.
5. **P5 — Acessível por obrigação.** Contraste AA, alvo mínimo 44px,
   `focus-visible` em todo elemento focável, nenhum estado comunicado apenas por
   cor (sempre cor + forma + texto).

---

## 2. Tokens

Definidos em `frontend/tailwind.config.ts` (`theme.extend`) e `frontend/src/index.css`.

> **Desvio consciente do design de referência:** a escala tipográfica / de
> espaçamento é *estendida*, não substituída — as chaves `page…micro` e
> `height.control/row` foram adicionadas sem remover a escala padrão do Tailwind.
> Novas telas devem usar **apenas** as chaves de token abaixo.

### 2.1. Cores (classes de token — nunca hex/rgb literal)

| Grupo | Chaves | Uso |
| :--- | :--- | :--- |
| `brand` | `50 100 200 400 600 700` | ação, navegação, item ativo, link. `600` base, `700` hover |
| `ink` | `900 800 700 500 400` | `900` sidebar e header · `700` texto principal · `500` secundário · `400` apoio/placeholder |
| `surface` | `DEFAULT canvas subtle hover` | `canvas` fundo de conteúdo · `subtle` cabeçalho de tabela / footer de card · `hover` linha em hover |
| `line` | `DEFAULT strong soft` | `DEFAULT` borda de painel · `strong` borda de input · `soft` divisor interno de tabela |
| `ok` `warn` `danger` | `fg base bg border` | **somente estado** (badge, validação, indicador de pendência) |
| `qual` | `fg base bg border` | eixo **qualitativo**: parecer descritivo, Educação Infantil, AEE |

**Gráficos (recharts):** use as CSS vars `var(--chart-brand)`, `var(--chart-grid)`,
`var(--chart-axis)` definidas em `index.css` — recharts exige string de cor e não
aceita classe Tailwind.

### 2.2. Tipografia

Fonte: `font-sans` = Public Sans · `font-mono` = IBM Plex Mono.

Escala fechada (`text-*`): `page` (32, título de página) · `section` (20) ·
`lg` (17) · `base` (15, corpo / valor de campo) · `label` (13.5, rótulo / th) ·
`sm` (13) · `help` (12.5, ajuda / meta) · `micro` (11, eyebrow mono). **Não use
tamanho fora desta lista.**

`font-mono tabular-nums` é **obrigatório** para: código INEP, código IBGE, CPF,
CNPJ, NIS, certidão, ID municipal, matrícula funcional, nº de matrícula, CEP,
telefone e **nota**.

### 2.3. Forma, sombra, dimensão

- Raio: `rounded` (6px) em controles · `rounded-lg` (10px) em painéis ·
  `rounded-pill` em badges.
- Sombra só em sobreposição real: `shadow-overlay` (modal, dropdown) ·
  `shadow-sticky` (barra de ação fixa). Nunca sombra decorativa em card.
- Altura de controle interativo: `h-control` (44px) · `h-control-sm` (36px, só
  ação em linha de tabela). Linha de tabela: `h-row` (44px).
- Largura máxima de conteúdo: `max-w-content` (1180px).

### 2.4. Regras validáveis em code review

- **Proibido** hex/rgb literal em `src/components/**` e `src/features/**`.
- **Proibido** `ok` / `warn` / `danger` / `qual` fora de estado.
- Fundo de página é sempre `bg-surface-canvas`; painel é
  `bg-white border border-line rounded-lg`.
- `:focus-visible` global já aplica halo de 3px — não remova `outline` sem
  substituir por `ring`.

---

## 3. Primitivos — `src/components/ui/`

Todos aceitam `className` (merge por `cn`) e repassam props nativas. Assinaturas
canônicas:

### 3.1. `Button.tsx`

```ts
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; // default 'secondary'
  size?: 'md' | 'sm';                                      // md = 44px, sm = 36px (só ação em linha)
  loading?: boolean;                                       // desabilita + spinner, mantém o texto
  iconLeft?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
```

| variant | classes | estado |
| :--- | :--- | :--- |
| `primary` | `bg-brand-600 text-white hover:bg-brand-700` | 1 por tela |
| `secondary` | `bg-white text-ink-700 border border-line-strong hover:bg-surface-subtle` | padrão |
| `danger` | `bg-white text-danger-fg border border-danger-border hover:bg-danger-bg` | ação destrutiva **nunca** é `primary` |
| `ghost` | `bg-transparent text-ink-500 hover:bg-surface-subtle` | ação terciária / em linha |

Base: `inline-flex items-center justify-center gap-2 rounded font-semibold text-label h-control px-5 disabled:opacity-45 disabled:cursor-not-allowed`.
(Aliases legados `default/outline/destructive` e `lg/icon` são aceitos, mas não
use em código novo.)

### 3.2. `Field.tsx` + `Input` / `Select` / `Textarea` / `Checkbox` / `SegmentedControl`

`Field` padroniza rótulo, obrigatoriedade, ajuda e erro. Integra com RHF via
`useFormContext` — se `error` não for passado, lê de `formState.errors[name]`.

```ts
type FieldProps = {
  label: string;
  name: string;
  required?: boolean;   // '*' em text-danger-base
  help?: string;        // text-help text-ink-400, abaixo do controle
  error?: string;       // substitui o help; ícone '!' + text-danger-fg
  mono?: boolean;       // font-mono no controle (códigos oficiais e nota)
  className?: string;
  children: React.ReactNode;
};
```

Estados do controle: default `h-control border border-line-strong bg-white px-3
text-base` · focus `ring-[3px] ring-brand-400/35 border-brand-400` · erro
`border-danger-base bg-danger-bg/40` · readonly/auto-preenchido
`bg-surface-subtle` · disabled `bg-surface-subtle text-ink-400 cursor-not-allowed`.

- `SegmentedControl<T>` substitui `<Select>` quando há **2–4 opções curtas**
  (turno, tipo de avaliação, filtro de status). Acima de 4 → `Select`.
- `Checkbox` com campo dependente: quando desmarcado, o campo dependente **não é
  renderizado** (nunca visível e inerte).

### 3.3. `Badge.tsx` — estado com cor **e** forma

```ts
type BadgeProps = {
  tone: 'brand' | 'ok' | 'warn' | 'danger' | 'qual' | 'neutral';
  shape?: 'dot' | 'square' | 'diamond'; // redundância não-cromática; default 'dot'
  children: React.ReactNode;
};
```

Base `inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-help
font-semibold bg-{tone}-bg text-{tone}-fg` + marcador `w-[7px] h-[7px]
bg-{tone}-base` (`rounded-pill` dot · nada em square · `rotate-45` diamond).

### 3.4. `DataTable.tsx`

```ts
type Column<T> = {
  key: string;
  header: string;
  align?: 'left' | 'right';   // 'right' para identificador e número
  mono?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;  // fim da linha, em hover/focus
  isLoading?: boolean;                        // → <TableSkeleton>
  empty?: React.ReactNode;                    // → <EmptyState>
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void };
};
```

`border border-line rounded-lg overflow-hidden`; `thead` sticky
`bg-surface-subtle text-label uppercase text-ink-500`; `tr` `h-row`, hover
`bg-surface-hover`; rodapé de paginação "1–20 de 49" em `tabular-nums`.
**Nunca** truncar sem `title`.

**Busca da lista vive aqui**, junto dos filtros da própria tela — não existe
busca global na casca (§4.1). Campo de busca em `h-control-sm`, à esquerda da
barra de filtros do painel que envolve a tabela.

### 3.5. `PageHeader.tsx`

```ts
type PageHeaderProps = {
  breadcrumb?: { label: string; to?: string }[];
  title: string;
  meta?: React.ReactNode;      // identificadores mono, idade, turma, <Badge/>
  actions?: React.ReactNode;   // no máx. 1 primary + 2 secondary
  tabs?: { label: string; to: string }[];
  activeTab?: string;          // rota da aba ativa
};
```

Aba ativa: `border-b-2 border-brand-600 text-brand-700`.

### 3.6. `ScopeBar.tsx` + `useScope()`

```ts
type ScopeBarProps = {
  level: 'network' | 'school' | 'class';
  title: string;                // 'Rede municipal de Igarassu' | nome da escola | '5º Ano A · Matemática'
  detail?: string;              // '49 escolas · ano letivo 2025 · 3º bimestre'
  onChangePeriod?: () => void;
};
```

`useScope()` deriva `level`/`title` de `authStore.user.role`:
`sme_admin | sme_supervisor → network`; `school_director | school_secretary →
school`; `teacher → class`.
`level='network'` → `bg-brand-50 border-brand-200`, eyebrow `ESCOPO` em
`font-mono text-micro text-brand-700`. Demais → `bg-surface-subtle border-line`.

### 3.7. `EmptyState` · `TableSkeleton` · `InlineError` · `FormSection` / `StickyActions` · `ConfirmDialog`

```ts
type EmptyStateProps  = { title: string; description: string; actions?: React.ReactNode };
type TableSkeletonProps = { rows?: number; cols?: number };
type InlineErrorProps = { code?: string; title: string; message: React.ReactNode; actions?: React.ReactNode };
type ConfirmDialogProps = { open: boolean; title: string; description: string; confirmLabel: string; destructive?: boolean; onConfirm(): void; onCancel(): void };
```

- `EmptyState`: `border border-dashed border-line-strong rounded-lg p-7`.
- `InlineError`: `border border-danger-border bg-danger-bg rounded p-4`; `code` em
  `font-mono text-[10.5px] text-danger-fg/70`.
- `FormSection({ title, description?, first? })`: `grid md:grid-cols-[200px_1fr]
  gap-6`, borda de topo entre seções (`first` remove).
  `StickyActions({ pending? })`: `sticky bottom-0 bg-surface-subtle border-t
  border-line shadow-sticky` — contador de pendências à esquerda, botões à direita.
- **Loading:** sempre `TableSkeleton` com a forma da lista final. **Proibido**
  spinner centralizado de página (o `loading` do `Button` é a única exceção).

---

## 4. Casca — `src/components/layout/`

### 4.1. `AppShell.tsx` — cabeçalho institucional + menu recolhível

```
grid grid-rows-[76px_1fr] h-screen
├── <AppHeader/>                        sticky top-0 z-30 · bg-ink-900 · full-bleed
└── <div class="grid overflow-hidden"   grid-cols-[268px_1fr] · recolhido: [68px_1fr]
    ├── <Sidebar collapsed={bool}/>     bg-ink-900 text-white overflow-y-auto
    └── <main class="bg-surface-canvas overflow-y-auto">
          <div class="mx-auto max-w-content px-4 lg:px-8 py-6 grid gap-5">{children}</div>
```

**Não existe `TopBar` de busca global.** A faixa branca entre o cabeçalho e o
conteúdo foi removida: duplicava a busca que cada lista já tem junto dos seus
filtros e empurrava o `PageHeader` para baixo da dobra. Busca é responsabilidade
de cada `DataTable` (§3.4).

#### `AppHeader.tsx` — altura fixa 76px

```
bg-ink-900 (gradiente vertical brand-900 → ink-900); foto institucional OPCIONAL
com overlay escuro até garantir 4.5:1 no texto branco.
├── esquerda: <NavToggle/>        44×44, 3 barras, atalho '[' , aria-expanded
│             <NetworkIdentity/>  'Rede Municipal de {municipio}' (text-lg font-bold text-white)
│                                 + 'Secretaria Municipal de Educação' (text-help text-white/60)
└── direita:  <PeriodBadge/>      'ANO LETIVO 2025 · 3º BIMESTRE' — font-mono text-micro text-white/60
              <NotificationBell/> círculo branco 40px + contador
              <UserMenuButton/>   PAPEL em caixa alta + escopo + chevron + avatar 44px de iniciais
```

| Elemento | Regras |
| :--- | :--- |
| `NavToggle` | único responsável por recolher/expandir a `Sidebar`; reflete o estado em `aria-expanded`; `title` com o atalho |
| `NotificationBell` | contador em `bg-danger-base text-white rounded-pill font-mono text-[11px]`, borda de 2px na cor do header para destacar; **zero** aparece em `neutral`, não em `danger`; some quando o usuário não tem canal de notificação |
| `UserMenuButton` | **um único alvo clicável** (`h-control`): papel em `text-label font-bold tracking-wide text-white`, escopo em `text-help text-white/70`, chevron, avatar com iniciais (`bg-warn-200 text-ink-800`, 44px). Abre: trocar perfil · trocar escola (só com mais de um escopo) · meus dados · sair |
| Foto de fundo | opcional, `object-cover` + overlay `bg-ink-900/70`; sem foto, o gradiente sólido é o padrão. Nunca deixe texto sobre área clara da imagem |

A identidade do usuário existe **somente aqui**. A `Sidebar` não repete nome nem
papel — ela é navegação e nada mais (ganha ~60px de altura útil com isso).

#### `Sidebar.tsx` — recolhível (268px ⇄ 68px)

```ts
type SidebarProps = { collapsed: boolean; onToggle(): void };
```

| Estado | Comportamento |
| :--- | :--- |
| Expandida (268px) | rótulo de grupo `font-mono text-micro text-white/60`; item `px-3 py-2.5 rounded text-sm`; badge de pendência à direita |
| Recolhida (68px) | só ícones 40×40 centralizados em alvo de 44px, **mesma ordem e mesmos separadores de grupo**; rótulo em tooltip (delay 400ms) no hover **e** no foco |

- Estado persistido por usuário em `localStorage` (`rede:nav:collapsed`); a
  transição de largura é 160ms `ease-out`; o conteúdo reflui, não remonta.
- Recolhe automaticamente abaixo de 1280px; abaixo de 1024px vira drawer
  sobreposto com overlay e `Esc` para fechar (mantém o comportamento anterior).
- Telas de grade densa (`BatchGrid`, Educacenso) abrem recolhidas por padrão.
- O **contador de pendência continua visível** no estado recolhido — recolher o
  menu não pode esconder trabalho pendente.
- Domínio sem ícone reconhecível não recebe pictograma inventado: use as três
  primeiras letras em `font-mono`.
- Item ativo mantém `bg-brand-600` nos dois estados.

### 4.2. `navigation.ts` — 7 grupos filtrados por papel

```ts
type Role = 'sme_admin' | 'sme_supervisor' | 'school_director' | 'school_secretary' | 'teacher' | 'student_guardian';
type NavItem = { label: string; to: string; roles: Role[]; matchPrefix?: string; icon?: React.ReactNode; badgeKey?: 'pendingTransfers' | 'gradeDeadlines' };
type NavGroup = { label: string | null; items: NavItem[] };

navForRole(role): NavGroup[]  // filtra por roles.includes(role) e descarta grupos vazios
```

Grupos: `(sem rótulo)` Dashboard gerencial / **Meus filhos** (`student_guardian`) ·
`REDE` (escolas e salas, currículo, ano letivo) · `PESSOAS` (alunos,
responsáveis, professores e alocações) · `VIDA ESCOLAR` (turmas, matrículas,
transferências) · `DIÁRIO DE CLASSE` (notas e frequência, pareceres, conteúdo) ·
`DOCUMENTOS` (arquivos dos alunos, boletins e carteirinhas, exportações,
Educacenso) · `COMUNICAÇÃO` (mensagens) · `ADMINISTRAÇÃO` (Usuários da Rede —
`sme_admin`).

`icon` passa a ser **obrigatório** para todo item que aparece no estado recolhido
(ou seja, todos) — sem ícone, o fallback é a abreviação de 3 letras em `font-mono`.

**Regra dura:** o menu nunca exibe item que retornaria 403 para o papel atual.
Rotas em português vivem em `src/app/routes/paths.ts` (`ROUTES`); rotas antigas em
inglês redirecionam via `LEGACY_REDIRECTS`.

Estilo: item `px-3 py-2.5 rounded text-sm text-white/90 hover:bg-white/10`; ativo
`bg-brand-600 font-semibold`; badge de pendência `bg-warn-base text-ink-900
rounded-pill px-1.5 text-[11px] font-bold`.

---

## 5. Mapa enum → rótulo → Badge — `src/components/ui/statusMaps.ts`

**Nunca** renderize o enum cru na interface. Todo enum do backend tem entrada
aqui; use `labelOf(MAP, valor)` (fallback para o próprio código).

```ts
type StatusDef = { label: string; tone: BadgeProps['tone']; shape?: BadgeProps['shape'] };
```

Mapas existentes: `ENROLLMENT_STATUS`, `TRANSFER_STATUS`, `EVALUATION_TYPE`,
`STAGE_TYPE`, `ACADEMIC_YEAR_STATUS`, `SHIFT`, `SCHOOL_TYPE`, `DOCUMENT_TYPE`,
`ATTENDANCE_STATUS`, `SCHOOL_HISTORY_STATUS`, `KINSHIP_TYPE`, `GENDER`,
`RACE_COLOR`, `USER_ROLE`, `REPORT_STATUS`, `DIARY_COMPLETENESS_STATUS`.

**Ao adicionar um enum no backend, adicione o mapa correspondente aqui na mesma PR.**

---

## 6. Mapa `error.code` → mensagem — `src/services/errorMessages.ts`

O backend responde `{ success: false, error: { code, message, details } }`.

```ts
type ErrorDef = {
  title: string;
  message: (details?: Record<string, unknown>) => string;
  action?: { label: string; kind: 'open-transfer' | 'view-class' | 'view-allocation' };
};
```

Cobertos: `DUPLICATE_ENROLLMENT`, `CLASS_CAPACITY_EXCEEDED`,
`TEACHER_SCHEDULE_CONFLICT`, `DUPLICATE_ALLOCATION`, `INVALID_STATUS_TRANSITION`,
`DESTINATION_SCHOOL_REQUIRED`, `NOT_DESTINATION_SCHOOL`, `*_NOT_FOUND`
(class/student/teacher/subject/transfer), `SCOPE_FORBIDDEN`, `ANALYTICS_FORBIDDEN`,
`INVALID_FILTER`, `INVALID_REPORT_PARAMS`, `REPORT_RATE_LIMITED`, `REPORT_EXPIRED`,
`EDUCACENSO_VALIDATION_FAILED`, `ACADEMIC_YEAR_NOT_FOUND`,
`STUDENT_HAS_ACTIVE_ENROLLMENT`, `INVALID_RESET_TOKEN`, `EXPIRED_RESET_TOKEN`,
`WEAK_PASSWORD`, `YEAR_ALREADY_CLOSED`, `YEAR_HAS_OPEN_PERIODS`,
`INVALID_TOTP_CODE`, `INVALID_2FA_CODE`, `INVALID_CHALLENGE_TOKEN`,
`TOTP_ALREADY_ENABLED`, `VALIDATION_ERROR`, HTTP 401/403/404/500 + fallback.

- Erro **com correção possível na tela** → `<InlineError>` **dentro do
  formulário** (via `components/feedback/FormError.tsx`), nunca só toast.
- Toast (`sonner`) é para confirmação de sucesso e para erro de rede.
- O `code` fica visível em `font-mono text-[10.5px]` para suporte.
- **Ao emitir um novo `error.code` no backend, adicione a entrada aqui na mesma PR.**

---

## 7. Padrões de página

### 7.1. Estrutura padrão

```tsx
<PageHeader breadcrumb={…} title="…" meta={…} actions={<Button variant="primary">…</Button>} tabs={…} />
<ScopeBar level={scope.level} title={scope.title} detail={scope.detail} />   {/* se exibe dado RBAC (P1) */}
{/* conteúdo: painéis bg-white border border-line rounded-lg */}
```

O `PageHeader` é o **primeiro** elemento do conteúdo — nada de faixa de busca ou
banner entre ele e o `AppHeader`.

### 7.2. Formulário longo → seções de duas colunas + barra de ação fixa

`FormProvider` (RHF) + `FormSection` por afinidade + `StickyActions` no rodapé +
`FormError` para o `error.code`. Nunca uma única coluna com muitos campos —
**seccione qualquer formulário com mais de 8 campos.**

- Seções canônicas de escola: **Identificação** · **Endereço** (CEP primeiro,
  autopreenche o resto → `bg-surface-subtle`) · **Contato**.
- Seções canônicas de aluno: **Busca no cadastro único** (§7.4) · **Identificação**
  · **Filiação** · **Documentos** (todos `mono`) · **Atendimento especializado**
  (AEE, revelado por checkbox).
- Campo derivado do escopo (`Secretaria Municipal` na criação) **não** é `Select` —
  vem de `authStore.user.education_department`.
- Obrigatoriedade: `*` visível + validação Zod; marque o que o **Educacenso**
  exige e diga isso no subtítulo.

### 7.3. Grade de lançamento em lote — `src/features/class-diary/components/BatchGrid.tsx`

```ts
type BatchColumn<Row> = {
  key: string;
  header: string;
  kind: 'number' | 'segment';
  min?; max?; step?;                       // number
  options?: { value: string; label: string; activeClass?: string }[]; // segment
  validate?: (value: string, row: Row) => string | undefined;
};
type CellState = 'pristine' | 'dirty' | 'invalid' | 'saved';
```

Requisitos: navegação por teclado (setas / Enter entre células) · estado por
célula · contador de pendências + inválidas · `deadline` opcional com `Badge` ·
`bulkActions` (ex. "marcar todos presentes") · guarda `beforeunload` quando há
alteração · Salvar desabilitado se `dirty === 0` ou `invalid > 0` · salvamento
único via `POST .../batch-upsert/` · erro em uma linha **não** descarta as outras.
Usado em `GradesPage` (numérico) e `AttendancePage` (segmentado).
A `Sidebar` abre recolhida nestas telas (§4.1).

### 7.4. Busca antes de criar (P2) — `src/components/feedback/PersonLookupStep.tsx`

Rotas de criação de pessoa renderizam `<PersonLookupStep>` antes do formulário:

1. Campo de busca (nome, CPF, certidão, NIS, ID municipal / matrícula funcional).
2. Resultados semelhantes em painel `bg-brand-50 border-brand-200`, cada um com
   nome, identificadores mono e `Usar este cadastro`.
3. Botão secundário `Nenhum é — cadastrar novo` libera o formulário.

### 7.5. Transferência — `TransferTimeline.tsx` + `TransferActionDialog.tsx`

`TransferTimeline` é um stepper de 4 passos: Solicitada → Aguardando SME →
Aceite do destino → Nova matrícula. Passo concluído `bg-ok-base` ✓; passo atual
`border-brand-600 bg-brand-50`; `REJECTED`/`CANCELLED` → selo `danger`.

As ações aparecem **só no passo atual e só para o papel habilitado**, via
`TransferActionDialog` (`mode: 'authorize' | 'accept' | 'reject'`):
SME faz `Autorizar` / `Recusar`; a escola de **destino** (ou `sme_admin`) faz
`Efetivar matrícula e aceitar` — o modo `accept` carrega um `<Select>` com as
turmas da escola de destino.

### 7.5.1. Confirmação em duas etapas (ações irreversíveis)

`AcademicYearClosingModal` (fechamento de ano) e `Anonimizar aluno` (LGPD) usam
o padrão: **etapa 1** lista o que a ação faz (`<ul>` em `text-help`) + botão
`danger` "Entendi, continuar"; **etapa 2** exige digitar um valor de
confirmação (o ano, o nome) para habilitar o botão final.

### 7.6. Painel do dia

Duas colunas `lg:grid-cols-[1.25fr_1fr]`:

- **"Precisa de você"** — pendências acionáveis; cada linha com marcador de
  severidade (`warn`/`danger`), título quantificado e botão para a lista **já
  filtrada**.
- **"A rede hoje"** — tabela chave/valor em `font-mono tabular-nums`. **Sem card
  com ícone colorido.** Todo valor é link; valor crítico em `text-danger-fg`.

Se um contador for 0 por ausência de dados, mostre `<EmptyState>` explicando o
motivo e oferecendo a ação de importação/cadastro.

### 7.7. Painel analítico (dashboard gerencial)

Padrão para telas de indicadores.

- Ordem fixa: `PageHeader` → `ScopeBar` → barra de filtros → faixa de KPIs →
  gráficos → tabelas → ações → relatórios.
- **KPI é faixa, não card:** um painel branco dividido em colunas por
  `border-line-soft`, valor em `font-mono tabular-nums text-[27px]`, rótulo em
  `font-mono text-micro text-ink-500`. Proibido card com ícone colorido (P4).
- Todo número é link para a lista já filtrada. Indicador sem destino não entra.
- Falha ou carregamento é **por painel**: `TableSkeleton`/esqueleto com a forma
  final e `InlineError` dentro do painel — uma falha não derruba a página.
- Dado ausente não é zero: `EmptyState` ou `—`.
- Gráfico usa recharts com as CSS vars `--chart-*`; `ok`/`warn`/`danger` só em
  faixa de desempenho e status, `qual` no eixo qualitativo. Todo gráfico traz
  rótulo numérico visível (legível sem hover e no PDF) e linha de referência
  legal com rótulo textual na legenda.
- Etapa qualitativa (Creche, Pré-escola, AEE) nunca entra em média de nota.

### 7.8. Notificações — `NotificationPopover.tsx`

Sino no `AppHeader` (pill branco, badge `bg-danger-base` quando há não lidas).
Ao abrir: painel `absolute right-0 top-12` (`w-[min(92vw,360px)]`), cabeçalho
com "Marcar todas como lidas", lista com `divide-y divide-line-soft`, item não
lido em `bg-brand-50/60` com ponto `bg-brand-600`. Contagem via
`useUnreadCount` (`refetchInterval: 60_000`); a lista carrega **sob demanda**
(`enabled: open`). Clique navega para `notification.link`.

### 7.9. Portal do responsável — `GuardianPortalPage.tsx`

`student_guardian` cai em `/` → `GuardianPortalPage` (não redireciona). Um
`StudentCardOverview` por dependente em `md:grid-cols-2` (1 coluna no mobile):
turma/escola, **Média geral** e **Frequência** como `Stat` (`text-lg
font-semibold tabular-nums`, `text-danger-fg` quando abaixo do mínimo), botões
`Baixar boletim` e `Falar com a coordenação`.

### 7.10. Diagnóstico Educacenso — `EducacensoValidationReport.tsx`

Faixa de status (`ok`/`warn`) + lista de pendências por entidade (chip
`bg-surface-subtle` com o tipo, rótulo, e `faltando: …` em `text-danger-fg`).
O botão de download do ZIP só habilita quando `data.ready === true`.

### 7.11. Painel de privacidade — `PrivacyConsentSection.tsx`

Card na ficha do aluno: três `Switch` de consentimento (fetch/POST
`/privacy/consents/`), botão `Baixar dados cadastrais (LGPD)` (gera um `Blob`
JSON e um `<a download>` client-side) e, para `sme_admin`, `Anonimizar aluno`
com o `ConfirmDialog` destrutivo (§7.5.1).

---

## 8. Acessibilidade e responsividade — critérios de aceite

- Alvo de toque ≥ 44px em qualquer controle (`h-control`).
- `:focus-visible` com anel de 3px em 100% dos focáveis; tabulação segue a ordem visual.
- Todo `<Field>` tem `<label for>` real; erro ligado por `aria-describedby` e `aria-invalid`.
- Estado nunca só por cor: `Badge` sempre traz texto + marcador de forma.
- Contraste mínimo 4.5:1 (os tokens `*-fg` sobre `*-bg` já cumprem) — inclusive
  texto branco do `AppHeader` sobre foto institucional.
- Tabela larga: scroll horizontal no próprio contêiner; **nunca** empilhar linha em card.
- `< 1280px`: `Sidebar` recolhe automaticamente. `< 1024px`: vira drawer com
  overlay; grades de formulário caem para 1 coluna; `BatchGrid` mantém scroll
  horizontal (é ferramenta de desktop).
- No estado recolhido, todo item de menu precisa de nome acessível
  (`aria-label` ou tooltip ligado por `aria-describedby`) — ícone sozinho não basta.
- Portal do responsável é **mobile-first**, texto base 16px, sem jargão.

---

## 9. Checklist para toda nova tela / PR de UI

- [ ] Nenhum hex/rgb literal — só classes de token (gráficos usam as CSS vars `--chart-*`).
- [ ] Nenhum enum do backend renderizado cru — tudo por `statusMaps.ts` / `labelOf()`.
- [ ] Nenhum item de menu visível para papel sem permissão.
- [ ] Nenhum spinner de página inteira — só `TableSkeleton`.
- [ ] `PageHeader` presente; `ScopeBar` presente quando a tela exibe dado filtrado por RBAC (P1).
- [ ] Formulário com mais de 8 campos está seccionado e tem `StickyActions`.
- [ ] Todo identificador oficial e toda nota em `font-mono tabular-nums`.
- [ ] Criar aluno/professor/responsável começa por `PersonLookupStep`.
- [ ] Ação irreversível (fechar ano, anonimizar, excluir em massa) usa a
      confirmação em duas etapas (§7.5.1).
- [ ] Novo `error.code` do backend tem entrada em `errorMessages.ts` (§6).
- [ ] Download de arquivo gerado no cliente usa `Blob` + `<a download>` (nunca
      um link `href` direto para endpoint autenticado).
- [ ] Notas e frequência salvam em uma única chamada `batch-upsert`.
- [ ] `error.code` com correção na tela → `InlineError` no formulário, não só toast.
- [ ] Novo enum / novo `error.code` no backend → mapa atualizado na mesma PR.
- [ ] Identidade do usuário só no `AppHeader`; `Sidebar` sem bloco de usuário.
- [ ] `Sidebar` funciona recolhida: ícone + tooltip + contador de pendência visíveis.
- [ ] Nenhuma faixa de busca global entre o `AppHeader` e o `PageHeader`.
- [ ] `npx tsc --noEmit`, `npm run build`, `npm run lint` e `npx vitest run` limpos.

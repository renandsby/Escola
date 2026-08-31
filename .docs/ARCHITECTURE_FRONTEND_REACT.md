# Design Doc & Padrões Arquiteturais: Frontend React / TypeScript

| Metadado | Detalhe |
| :--- | :--- |
| **Documento** | Diretrizes de Arquitetura, Clean Code e Padrões de Engenharia Frontend |
| **Stack** | React 18, TypeScript 5 (Strict Mode), Vite 5, TanStack Query v5, Zustand, React Hook Form + Zod, Tailwind CSS 3, sonner (toasts). Design System próprio ("Rede") em `src/components/ui/` — ver [`DESIGN_SYSTEM_REDE.md`](DESIGN_SYSTEM_REDE.md) |
| **Público-Alvo** | Agentes de IA, Tech Leads, Engenheiros de Software |
| **Status** | Padrão Oficial & Obrigatório do Projeto |

---

## 1. Filosofia de Engenharia e Princípios Fundamentais

O frontend da aplicação segue uma arquitetura orientada a domínios (**Feature-Driven Architecture**), garantindo alta coesão, desacoplamento e previsibilidade no fluxo de dados.

### Princípios Inegociáveis:
1. **Separação Clara de Tipos de Estado:**
   * **Server State (Dados Remotos):** Gerenciado **exclusivamente** pelo **TanStack Query (React Query v5)**. Caching, deduplicação, refetching em background e mutações com feedback otimista.
   * **Client / UI State (Sessão & Interface):** Gerenciado via **Zustand** para dados globais leves (usuário autenticado, tokens, tema, modais globais).
   * **Form State:** Gerenciado via **React Hook Form** integrado ao **Zod** para validação estática de schemas tipados.
2. **Componentes Presentacionais vs. Containers (Smart vs. Dumb):**
   * Componentes de UI pura (`components/ui/`) não conhecem chamadas de rede nem regras de negócio.
   * Componentes de página ou widgets de domínio orquestram hooks de dados e passam props tipadas para os componentes de UI.
3. **Tipagem Estrita (Zero `any`):**
   * O projeto roda com `strict: true` no `tsconfig.json`. É expressamente proibido o uso de `any` ou type casting forçado sem narrowing seguro.
4. **Resiliência e Feedback Visual:**
   * Toda tela assíncrona **deve** tratar explicitamente 4 estados visuais: **Loading (Skeleton)**, **Empty State**, **Error State** e **Success State**.

---

## 2. Estrutura Modular de Diretórios (Feature-Sliced)

O código-fonte reside dentro de `src/`, estruturado por domínios de negócio:

```text
frontend/src/
├── app/                          # Configurações globais da aplicação
│   ├── providers/                # QueryClientProvider, AuthProvider, ThemeProvider
│   ├── routes/                   # Definição central de rotas e Guards de navegação
│   └── App.tsx
│
├── components/                   # Componentes Compartilhados Globais
│   ├── ui/                       # Design System / UI Primitives (Button, Modal, Table, Input)
│   ├── feedback/                 # ErrorBoundary, PageLoader, EmptyState
│   └── layout/                   # Header, Sidebar, MunicipalBrand, UserMenu
│
├── features/                     # MÓDULOS DE NEGÓCIO (Bounded Contexts)
│   ├── authentication/           # Login por CPF ou e-mail (com desafio 2FA), 2FA/TOTP, "esqueci minha senha", verificação de e-mail, perfil, Usuários da Rede
│   ├── governance/               # Secretaria, matrizes, anos letivos e bimestres, fechamento de ano letivo
│   ├── schools/                  # Gestão de Escolas
│   ├── classes/                  # CRUD de Turmas e Salas, Alocação de Professores
│   ├── students/                 # Cadastro único, Matrículas, Transferências, LGPD na ficha, código de vínculo de responsável
│   ├── guardians/                # Portal "Meus filhos" + auto-cadastro público + vinculação de estudante (código / solicitação); fila "Solicitações de vínculo" (equipe)
│   ├── admissions/               # Matrícula/rematrícula online: ciclos, rematrículas, solicitação de vaga, comprovantes de prioridade
│   ├── class-diary/              # Lançamento em lote de Notas, Frequência e Pareceres
│   ├── reports/                  # Boletim/carteirinha PDF, Exportações, Educacenso
│   ├── dashboard/                # Painel gerencial (KPIs, gráficos, completude, auditoria; filtro de ano letivo e bimestre)
│   └── notifications/            # NotificationPopover (sino do cabeçalho)
│
├── hooks/                        # Custom Hooks Genéricos (useDebounce, useMediaQuery)
├── services/                     # Configuração de Clientes HTTP e Interceptors
│   ├── api.ts                    # Axios / Fetch client configurado com Interceptors
│   └── tokenService.ts           # Gestão segura de tokens em memória/storage
├── stores/                       # Zustand Stores (authStore, uiStore)
├── types/                        # Tipos e Interfaces globais do TypeScript
└── utils/                        # Formatadores (CPF, Datas, Moeda) e Helpers puros
```

### 2.1. Estrutura Interna de uma Feature (`features/<nome>/`):
```text
features/students/
├── api/                          # Funções de requisição HTTP da feature
│   ├── getStudents.ts
│   ├── getStudentById.ts
│   └── enrollStudent.ts
├── hooks/                        # Hooks de React Query (useStudentsQuery, useEnrollMutation)
│   ├── useStudentsQuery.ts
│   └── useEnrollStudentMutation.ts
├── components/                   # Componentes visuais exclusivos desta feature
│   ├── StudentTable.tsx
│   ├── StudentFormModal.tsx
│   └── StudentFilterBar.tsx
├── schemas/                      # Schemas de validação Zod para formulários
│   └── studentSchema.ts
├── types/                        # Tipos específicos do domínio de Alunos
│   └── index.ts
└── pages/                        # Páginas roteáveis da feature
    ├── StudentsListPage.tsx
    └── StudentDetailsPage.tsx
```

---

## 3. Comunicação HTTP, Interceptors e Refresh Token

A camada de rede gerencia automaticamente a injeção do Bearer Token e a renovação transparente de sessão expirada (401), prevenindo loops infinitos e condições de corrida com fila de retry.

```typescript
// src/services/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de Requisição: Injeção do Token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Resposta: Renovação com Refresh Token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes("/accounts/token/refresh/")) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<{ access: string; refresh?: string }>(
          `${apiClient.defaults.baseURL}/accounts/token/refresh/`,
          { refresh: refreshToken }
        );

        useAuthStore.getState().setTokens(data.access, data.refresh || refreshToken);
        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 4. Padrão de Chamadas Assíncronas com TanStack Query

Todas as consultas e mutações devem ser encapsuladas em custom hooks tipados. **Nunca faça chamadas `apiClient.get/post` diretamente dentro de componentes `useEffect`.**

```typescript
// src/features/students/hooks/useEnrollStudentMutation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

interface EnrollPayload {
  student_id: string;
  school_class_id: string;
}

interface EnrollmentResponse {
  id: string;
  enrollment_number: string;
  status: string;
}

export const useEnrollStudentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EnrollPayload): Promise<EnrollmentResponse> => {
      const { data } = await apiClient.post<EnrollmentResponse>("/students/enrollments/", payload);
      return data;
    },
    onSuccess: () => {
      toast.success("Matrícula realizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["school-classes"] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || "Falha ao realizar matrícula.";
      toast.error(message);
    },
  });
};
```

---

## 5. Formulários com React Hook Form + Zod

A validação de formulários é sempre orientada por schema estático TypeScript com **Zod**, garantindo validação em tempo de execução e autocompletion no IDE.

```typescript
// src/features/students/schemas/studentSchema.ts
import { z } from "zod";

export const studentSchema = z.object({
  full_name: z
    .string()
    .min(3, "Nome completo deve ter no mínimo 3 caracteres.")
    .max(200, "Nome não pode exceder 200 caracteres."),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve conter exatamente 11 dígitos numéricos.")
    .optional()
    .or(z.literal("")),
  birth_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Data de nascimento inválida."),
  mother_name: z
    .string()
    .min(3, "Nome da mãe é obrigatório."),
  has_special_needs: z.boolean().default(false),
  special_needs_details: z.string().optional(),
});

export type StudentFormData = z.infer<typeof studentSchema>;
```

---

## 6. Controle de Acesso e Rotas Protegidas (RBAC)

A navegação e a renderização de elementos de ação (botões, menus) são protegidas por papel de usuário (*Role-Based Access Control*).

```tsx
// src/app/routes/ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

type UserRole =
  | "sme_admin" | "sme_supervisor"
  | "school_director" | "school_secretary"
  | "teacher" | "student_guardian";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return <div className="flex h-screen items-center justify-center">Carregando permissões...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
```

**Rotas públicas** (fora do `<ProtectedRoute>`): `/login`, `/esqueci-senha`,
`/redefinir-senha/:token`, `/cadastro-responsavel` (auto-cadastro do responsável)
e `/verificar-email/:token` · `/verificar-email/pendente` (confirmação de e-mail).
O acesso à vida escolar do responsável só é liberado após a verificação de e-mail
(`user.email_verified`); enquanto pendente, o portal exibe um aviso com "reenviar
link".

---

## 7. Diretrizes Críticas para Agentes de IA (Frontend DOs & DON'Ts)

| Ação Proibida (DON'T) ❌ | Ação Obrigatória (DO) ✅ |
| :--- | :--- |
| **NUNCA** use `any` ou ignore checagens de tipos com `@ts-ignore`. | **SEMPRE** defina interfaces ou infira tipos estritos via Zod (`z.infer<typeof schema>`). |
| **NUNCA** faça fetch de dados diretamente em `useEffect` com `setState` manual para chamadas REST de leitura. | **SEMPRE** utilize `useQuery` do TanStack Query com chaves únicas bem estruturadas (`queryKey: ['resource', id]`). |
| **NUNCA** deixe formulários sem validação estruturada ou com validações manuais dispersas no JSX. | **SEMPRE** utilize `react-hook-form` com `zodResolver`. |
| **NUNCA** renderize telas assíncronas sem estado de loading/erro (ex: tela em branco enquanto espera a API). | **SEMPRE** renderize Skeletons de carregamento e banners/toasts de erro informativos. |
| **NUNCA** construa componentes gigantes (>300 linhas de JSX misturando lógica de API, form e tabela). | **SEMPRE** divida em subcomponentes atômicos e extraia a lógica de dados para Custom Hooks. |
| **NUNCA** persista tokens sensíveis em `localStorage` sem considerar regras de expiração e logout em cascata. | **SEMPRE** utilize a store de autenticação centralizada com interceptor de renovação de refresh token. |

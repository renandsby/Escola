
# Frontend - Sistema de Gestão Escolar

Frontend da aplicação de gestão escolar desenvolvido com React 19, TypeScript e Vite.

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
frontend/
├── src/
│   ├── pages/                  # Páginas da aplicação
│   │   ├── auth/              # Autenticação
│   │   ├── dashboard/         # Dashboard
│   │   ├── students/          # Alunos
│   │   ├── classes/           # Turmas
│   │   └── ...
│   ├── components/            # Componentes reutilizáveis
│   │   ├── layout/            # Layout (Sidebar, Header)
│   │   ├── common/            # Componentes comuns
│   │   ├── forms/             # Formulários
│   │   └── tables/            # Tabelas
│   ├── hooks/                 # Custom hooks
│   ├── services/              # Serviços de API
│   ├── store/                 # Zustand stores
│   ├── types/                 # Tipos TypeScript
│   ├── utils/                 # Funções utilitárias
│   ├── layouts/               # Layouts da aplicação
│   ├── contexts/              # React contexts
│   ├── routes/                # Configuração de rotas
│   ├── assets/                # Imagens, fonts, etc
│   ├── App.tsx                # Componente raiz
│   └── main.tsx               # Ponto de entrada
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## 🚀 Quick Start

### Instalação

```bash
# Entre no diretório frontend
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

### Build para Produção

```bash
npm run build
npm run preview
```

## 🛠️ Tecnologias

### Framework & Build
- **React 19** - Biblioteca de UI
- **Vite** - Build tool rápido
- **TypeScript** - Type safety

### Roteamento & Estado
- **React Router v6** - Roteamento
- **Zustand** - Gerenciamento de estado
- **TanStack Query** - Gerenciamento de dados do servidor

### Forms & Validação
- **React Hook Form** - Gerenciamento de forms
- **Zod** - Validação de schema

### UI & Styling
- **TailwindCSS** - CSS framework
- **Shadcn UI** - Componentes
- **Lucide Icons** - Ícones

### Utilitários
- **Axios** - Cliente HTTP
- **Date-fns** - Utilitários de data
- **js-cookie** - Gerenciamento de cookies
- **QRCode** - Geração de QR Codes

## 📱 Features

### Autenticação
- Login com JWT
- Refresh token automático
- Logout
- Persistência de sessão

### Layout
- Sidebar responsiva
- Header com notificações
- Menu de usuário
- Responsive design

### Formulários
- Validação em tempo real
- Feedback de erros
- Componentes reutilizáveis
- Suporte a upload de arquivos

### Dados
- React Query para cache e sincronização
- Paginação
- Filtros e busca
- Loading states

## 🔄 API Integration

O cliente HTTP está configurado com interceptors:

```typescript
import { apiClient, authService, studentService } from '@/services/api'

// Login
const response = await authService.login('user', 'password')

// Listar alunos
const students = await studentService.list({ page: 1 })

// Criar aluno
const newStudent = await studentService.create(data)
```

## 🎨 Componentes Principais

### Layout
- `Layout` - Layout principal com sidebar e header
- `Sidebar` - Menu de navegação
- `Header` - Barra superior

### Pages
- `LoginPage` - Página de login
- `DashboardPage` - Dashboard principal

### Hooks Customizados
- `useAuthStore` - Gerenciar estado de autenticação
- Adicione mais conforme necessário

## 📊 State Management

### Zustand Store (Auth)

```typescript
import { useAuthStore } from '@/store/auth'

const { token, user, isAuthenticated, login, logout } = useAuthStore()
```

## 🧪 Testes

```bash
# Rodar testes
npm run test

# Cobertura de testes
npm run test:coverage
```

## 🔍 Linting & Formatação

```bash
# Lint do código
npm run lint

# Formatação com Prettier
npm run format

# Type checking
npm run type-check
```

## 🌐 Variáveis de Ambiente

Configure no arquivo `.env.local`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 📚 Convenções

- Componentes em PascalCase
- Funções/variáveis em camelCase
- Imports organizados (React, bibliotecas, locais)
- Props bem tipadas com TypeScript
- Estrutura de pastas por feature

## 🔒 Segurança

- Tokens JWT no localStorage
- Renovação automática de token
- CORS configurado
- Validação de entrada com Zod
- Headers seguros no axios

## 🚀 Performance

- Code splitting automático com Vite
- Lazy loading de rotas
- Otimização de bundles
- Gzip compression
- Cache de assets

## 📞 Suporte

Para dúvidas sobre a arquitetura ou implementação, consulte o README principal.

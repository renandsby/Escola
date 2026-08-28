# Guia de Engenharia e Regras de Desenvolvimento para Agentes de IA

| Metadado | Detalhe |
| :--- | :--- |
| **Documento** | Regras de Execução, Qualidade de Código e Protocolo de Modificação |
| **Público** | Agentes de Inteligência Artificial e Desenvolvedores do Projeto |
| **Versão** | 1.0.0 |
| **Escopo** | Backend (Django/DRF) e Frontend (React/TS) |

---

## 1. Protocolo de Implementação de Tarefas

Ao receber uma solicitação para criar ou modificar uma funcionalidade, o Agente de IA **deve** seguir as seguintes etapas em ordem rigorosa:

```text
[1. Entendimento do Domínio & RBAC]
                  │
                  ▼
[2. Modificação no Backend (Model -> Migration -> Selector/Service -> Serializer -> View)]
                  │
                  ▼
[3. Testes Automatizados no Backend (Unitário & Integração)]
                  │
                  ▼
[4. Modificação no Frontend (Types -> API Client/Hook -> Schema/Zod -> Component/Page)]
                  │
                  ▼
[5. Validação de Regressão & Feedback Visual (Loading, Erro, Sucesso)]
```

---

## 2. Checklist de Validação de Código (Definition of Done para IA)

### 2.1. Backend Checklist:
- [ ] O modelo herda de `UUIDModel` e `TimeStampedModel`?
- [ ] A regra de negócio foi escrita em `services/` e não no Serializer ou View?
- [ ] A consulta foi escrita em `selectors/` com `select_related` / `prefetch_related` para evitar N+1?
- [ ] As operações com múltiplas escritas estão protegidas com `@transaction.atomic`?
- [ ] Há classes de permissão explícitas em cada endpoint?
- [ ] Erros lançam `BusinessLogicError` com código semântico e mensagem amigável?
- [ ] Foram criados testes com `pytest` e `factory_boy` para cobrir os fluxos de sucesso e exceção?

### 2.2. Frontend Checklist:
- [ ] O código está 100% tipado sem nenhum uso de `any`?
- [ ] As chamadas de leitura utilizam `useQuery` e as mutações utilizam `useMutation` com invalidação de cache?
- [ ] Os formulários utilizam `react-hook-form` com validação de schema `zod`?
- [ ] Existem estados visuais para carregamento (Skeleton), erro (Toast/Banner) e lista vazia (Empty State)?
- [ ] A rota ou componente de ação respeita o papel do usuário logado via RBAC?
- [ ] O layout é responsivo e adere às classes de utilidade do Tailwind CSS?

---

## 3. Padrão de Mensagens de Commit e Versionamento

Toda alteração deve ser documentada segundo o padrão **Conventional Commits**:
* `feat(backend/students)`: Adiciona serviço de enturmação com validação de capacidade
* `fix(frontend/auth)`: Corrige race condition no interceptor de refresh token
* `test(backend/classes)`: Adiciona testes unitários para alocação docente
* `refactor(backend/schools)`: Isola selectors de consulta de escolas por usuário
* `docs(architecture)`: Atualiza diagrama de bounded contexts do sistema

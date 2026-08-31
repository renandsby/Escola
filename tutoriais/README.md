# 📚 Tutoriais de uso — Sistema de Gestão Escolar Municipal

Guias passo a passo da jornada de cada papel dentro do sistema. Cada tutorial
descreve **o que o usuário enxerga**, **como fazer cada tarefa** e **quais
limitações conhecidas** ainda existem.

| Papel | Perfil no sistema | Tutorial |
| :--- | :--- | :--- |
| Administrador da SME | `sme_admin` | [administrador-sme.md](administrador-sme.md) |
| Diretor(a) de escola | `school_director` | [diretor-escola.md](diretor-escola.md) |
| Professor(a) | `teacher` | [professor.md](professor.md) |
| Responsável / aluno | `student_guardian` | [responsavel-aluno.md](responsavel-aluno.md) |

> Existe ainda o papel **`sme_supervisor`** (supervisor pedagógico da SME), com
> visão semelhante à do administrador porém **sem** poder cadastrar escolas,
> professores e usuários — e o papel **`school_secretary`** (secretário
> escolar), com as mesmas telas do diretor voltadas a alunos e matrículas.

## Como o acesso funciona

- **Login por CPF ou e-mail.** O identificador principal de toda pessoa é o
  **CPF** (11 dígitos); o e-mail também é único e serve para entrar. A tela de
  login aceita qualquer um dos dois.
- **Contas da equipe** (SME, direção, secretaria, professores) são criadas pelo
  administrador da SME. Cada pessoa recebe CPF/e-mail e senha e pode trocá-la em
  **Configurações** ou pelo link **"Esqueci minha senha"**.
- **Responsáveis** podem ter a conta criada pela escola **ou** fazer
  **auto-cadastro** em **"Criar conta"** na tela de login
  (`/cadastro-responsavel`). O auto-cadastro exige **confirmar o e-mail** antes
  de liberar a vida escolar e depois **vincular o estudante** — por um
  **código** fornecido pela secretaria ou por uma **solicitação** com prova de
  parentesco (CPF + data de nascimento + nome da mãe do aluno), que a escola
  aprova. Detalhes em [responsavel-aluno.md](responsavel-aluno.md).
- Qualquer usuário pode ativar a **autenticação em dois fatores (2FA)** em
  **Configurações → Segurança** — TOTP com Google Authenticator, Authy ou
  similar, mais 8 códigos de backup de uso único. Com o 2FA ativo, o login
  pede um código de 6 dígitos após usuário/senha.
- O sistema aplica **controle de acesso hierárquico**: o administrador enxerga
  toda a rede municipal; o diretor, apenas a própria escola; o professor,
  apenas as turmas em que está alocado; o responsável, apenas o(s) aluno(s)
  vinculado(s) a ele.
- O **menu lateral** mostra somente os itens permitidos ao papel de quem
  está logado. O **sino** no cabeçalho abre a central de notificações.

## Endereços

| Recurso | URL |
| :--- | :--- |
| Sistema (aplicação web) | `http://localhost:3000` |
| Documentação da API | `http://localhost:8000/api/docs/` |
| Área administrativa técnica (Django Admin) | `http://localhost:8000/admin/` |

## Carga de dados para demonstração

**Base estrutural de Igarassu/PE** (Censo Escolar 2025 do INEP) — Secretaria,
ano letivo, etapas, disciplinas, matrizes, **49 escolas**, salas e **~535
turmas**, mais os usuários `admin` / `admin123` e `supervisor` / `supervisor123`:

```bash
docker compose exec backend python manage.py seed_censo_igarassu
```

**Carga fictícia completa** (alunos, matrículas, notas, frequência, pareceres,
responsáveis e vínculos, consentimentos LGPD, documentos, notificações,
transferências e o ano letivo anterior já encerrado com histórico consolidado):

```bash
docker compose exec backend python manage.py seed_dashboard_demo --fresh
```

Logins de demonstração criados por essa carga:

| Usuário | Senha | Papel |
| :--- | :--- | :--- |
| `admin` | `admin123` | Administrador da SME |
| `responsavel` | `resp123` | Responsável com **2 filhos** (portal da família) |

Alternativa menor e autocontida (rede de exemplo "São Paulo", usuários com
sufixo `.sp`): `python manage.py seed_municipal`.

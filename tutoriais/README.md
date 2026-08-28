# 📚 Tutoriais de uso — Sistema de Gestão Escolar Municipal

Guias passo a passo da jornada de cada papel dentro do sistema. Cada tutorial
descreve **o que o usuário enxerga**, **como fazer cada tarefa** e **quais
limitações conhecidas** existem na versão atual.

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

- **Não há autocadastro.** As contas são criadas pelo administrador da SME
  (ou, para alunos/responsáveis, pela escola). Cada pessoa recebe um
  **usuário e senha**.
- O sistema aplica **controle de acesso hierárquico**: o administrador enxerga
  toda a rede municipal; o diretor, apenas a própria escola; o professor,
  apenas as turmas em que está alocado; o responsável, apenas o(s) aluno(s)
  vinculado(s) a ele.
- O **menu lateral** mostra somente os itens permitidos ao papel de quem
  está logado.

## Endereços

| Recurso | URL |
| :--- | :--- |
| Sistema (aplicação web) | `http://localhost:3000` |
| Documentação da API | `http://localhost:8000/api/docs/` |
| Área administrativa técnica (Django Admin) | `http://localhost:8000/admin/` |

## Carga inicial da rede

A base de Igarassu/PE é montada a partir do Censo Escolar 2025 do INEP:

```bash
docker compose exec backend python manage.py seed_censo_igarassu
```

Isso cria a Secretaria, o ano letivo, as etapas de ensino, as disciplinas, as
matrizes curriculares, **49 escolas**, as **salas de aula** e **~535 turmas**,
além dos usuários `admin` / `admin123` e `supervisor` / `supervisor123`.

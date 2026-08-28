# 🏫 Tutorial — Diretor(a) de Escola

**Perfil:** `school_director` · **Visão:** apenas a sua unidade escolar.

O diretor acompanha e gerencia os dados **da própria escola**: alunos,
matrículas, turmas e o desempenho pedagógico. O cadastro de escolas,
professores e disciplinas é feito pela Secretaria (SME).

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Painel inicial](#2-painel-inicial)
3. [Dados da escola](#3-dados-da-escola)
4. [Turmas](#4-turmas)
5. [Alunos](#5-alunos)
6. [Matrículas](#6-matrículas)
7. [Acompanhamento pedagógico](#7-acompanhamento-pedagógico)
8. [Comunicação e documentos](#8-comunicação-e-documentos)
9. [Configurações](#9-configurações)
10. [Limitações conhecidas](#10-limitações-conhecidas)

---

## 1. Primeiro acesso

1. Abra `http://localhost:3000`.
2. Informe o **usuário e senha** fornecidos pela Secretaria e clique em **Entrar**.
3. Você cai no **Dashboard**, com os dados **da sua escola**.
4. O menu lateral mostra apenas as áreas do seu papel: Dashboard, Escolas,
   Alunos, Matrículas, Turmas, Notas, Pareceres, Frequência, Boletins
   Consolidados, Mensagens, Documentos.

---

## 2. Painel inicial

Menu **Dashboard**.

- Cartões com os totais **da sua escola**: **Alunos**, **Turmas**,
  **Disciplinas** e **Escolas** (a sua). Cada cartão leva à listagem.
- **Menu Rápido:** Alunos, Turmas, Boletins, Frequência.

---

## 3. Dados da escola

Menu **Escolas** (`/schools`).

- A listagem mostra **somente a sua escola**.
- Clique no ✏️ para **editar** os dados: contato (e-mail, telefone, site),
  endereço completo e capacidade padrão de alunos por turma.
- O **tipo da escola** e o vínculo com a Secretaria são definidos pela SME.

---

## 4. Turmas

Menu **Turmas** (`/classes`).

- Lista as turmas da sua escola: nome, turno, escola, nº de alunos e status.
- **Busca** por nome ou escola.
- A criação de turmas é feita pela Secretaria/carga inicial (ver limitações).
  O diretor **acompanha** as turmas e o número de alunos matriculados.

---

## 5. Alunos

Menu **Alunos** (`/students`).

### Consultar

- Tabela com ID municipal, nome, nome da mãe e status — **restrita à sua escola**.
- **Busca** por nome, ID municipal ou nome da mãe.
- Ícone 👁️ abre o **Boletim** do aluno: notas por disciplina, resumo de
  frequência e botão **Imprimir**.

### Cadastrar / editar aluno

1. **Novo Aluno**.
2. Preencha nome completo, ID municipal, nome da mãe, data de nascimento
   (obrigatórios) e a Secretaria; complete os campos opcionais (CPF, gênero,
   raça/cor, necessidades especiais etc.).
3. **Salvar**. Em seguida, matricule o aluno numa turma (próximo passo).

---

## 6. Matrículas

Menu **Matrículas** (`/enrollments`).

### Consultar

- Tabela com número da matrícula, aluno, turma e status. É possível **alterar o
  status** da matrícula pela listagem.
- **Busca** por aluno ou número de matrícula.

### Matricular um aluno

1. **Nova Matrícula**.
2. Selecione o **Aluno**, a **Turma** da sua escola e informe o
   **número da matrícula**.
3. **Salvar**.

### Regras automáticas

- **Não** é permitida uma segunda matrícula ativa para o mesmo aluno **no mesmo
  ano letivo**.
- A matrícula é recusada se a turma já atingiu a **capacidade máxima**.

---

## 7. Acompanhamento pedagógico

O diretor visualiza o diário de classe **da sua escola**:

| Menu | O que mostra |
| :--- | :--- |
| **Notas** (`/grades`) | Notas lançadas pelos professores da escola |
| **Frequência** (`/attendance`) | Registros de frequência da escola |
| **Pareceres** (`/evaluations`) | Pareceres descritivos (Educação Infantil) |
| **Boletins Consolidados** (`/boletins`) | Consolidação por turma — média geral e status (aprovado/reprovado) de cada aluno; botão **Imprimir** |

O **lançamento** é responsabilidade do professor; o diretor acompanha e imprime
os consolidados.

---

## 8. Comunicação e documentos

- **Mensagens** (`/messages`) — **Nova Mensagem** para falar com professores e a
  Secretaria; clique numa mensagem para lê-la.
- **Documentos** (`/documents`) — consulta e download de documentos da escola.

---

## 9. Configurações

Menu **Configurações** (`/settings`) — perfil, notificações, aparência e
segurança. Use **Sair da Conta** para encerrar a sessão.

---

## 10. Limitações conhecidas

| Área | Situação atual |
| :--- | :--- |
| **Transferências** | O aceite de uma transferência recebida é competência da escola de destino, mas **a tela de Transferências hoje só é acessível pela SME**. Peça à Secretaria para concluir o aceite, ou use o endpoint `PATCH /api/v1/sme/transfers/{id}/accept/`. |
| **Criar turma** | Sem tela própria — as turmas vêm da carga inicial; novas turmas são criadas pela SME (API/área administrativa). |
| **Cadastro de professores e disciplinas** | Exclusivo da SME. O diretor apenas consulta o resultado (turmas, notas). |
| **Boletim/carteirinha em PDF** | Disponíveis apenas via API; na interface use **Imprimir**. |
| **Trocar senha pela interface** | Ainda inativo — solicite à SME. |

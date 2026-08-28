# 👩‍🏫 Tutorial — Professor(a)

**Perfil:** `teacher` · **Visão:** apenas as turmas em que você está alocado.

O professor usa o sistema para o **diário de classe**: lançar notas, registrar
frequência e escrever pareceres descritivos das turmas sob sua responsabilidade.

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Painel inicial](#2-painel-inicial)
3. [Minhas turmas](#3-minhas-turmas)
4. [Lançar notas](#4-lançar-notas)
5. [Registrar frequência](#5-registrar-frequência)
6. [Pareceres descritivos (Educação Infantil)](#6-pareceres-descritivos-educação-infantil)
7. [Boletins consolidados](#7-boletins-consolidados)
8. [Mensagens e documentos](#8-mensagens-e-documentos)
9. [Configurações](#9-configurações)
10. [Limitações conhecidas](#10-limitações-conhecidas)

---

## 1. Primeiro acesso

1. Sua conta é criada pela Secretaria (SME). Você recebe **usuário e senha**.
2. Abra `http://localhost:3000`, informe usuário e senha e clique em **Entrar**.
3. Você cai no **Dashboard**. O menu lateral mostra: Dashboard, Turmas, Notas,
   Pareceres, Frequência, Boletins Consolidados, Mensagens e Documentos.

> Se ao entrar em Notas/Frequência as listas de turma vierem vazias, é porque
> você ainda **não foi alocado** em nenhuma turma. Fale com a Secretaria.

---

## 2. Painel inicial

Menu **Dashboard**. Mostra um resumo e o **Menu Rápido** (Turmas, Boletins,
Frequência).

Existe também um painel específico do professor em `http://localhost:3000/teacher-dashboard`
com **minhas turmas**, **total de alunos**, **média de notas**, **frequência
média** e um gráfico de média por disciplina.

---

## 3. Minhas turmas

Menu **Turmas** (`/classes`).

- Lista **somente as turmas em que você está alocado**, com nome, turno,
  escola, nº de alunos e status.
- É a partir dessas turmas que você lança notas e frequência.

---

## 4. Lançar notas

Menu **Notas** (`/grades`).

1. Clique em **Lançar Notas**.
2. Selecione, no topo:
   - **Turma**
   - **Disciplina**
   - **Período** (bimestre)
3. A lista de alunos matriculados na turma aparece. Para cada aluno, preencha:
   - **Nota** (avaliação do período)
   - **Nota de recuperação** (se houver)
   - **Nota final**
   Se já existir nota lançada para aquele aluno/disciplina/período, o campo vem
   **preenchido** e você apenas ajusta.
4. Clique em **Salvar Notas**. Todas as linhas são gravadas de uma vez.

A tabela principal da tela mostra o **histórico de notas** já lançadas; use a
**busca** por aluno, disciplina ou período.

---

## 5. Registrar frequência

Menu **Frequência** (`/attendance`).

1. Clique em **Lançar Frequência**.
2. Selecione **Turma**, **Disciplina** e a **data** da aula.
3. A lista de alunos aparece. Marque, para cada um, **presente** ou **ausente**
   (registros já feitos para aquela data vêm marcados).
4. Clique em **Salvar Frequência**.

A tabela principal lista os registros já feitos; use a **busca** por aluno.

---

## 6. Pareceres descritivos (Educação Infantil)

Menu **Pareceres** (`/evaluations`).

Para turmas de Educação Infantil (avaliação descritiva, sem nota numérica):

1. Selecione o **aluno** e o **período**.
2. Escreva o **texto do parecer** no campo.
3. Clique em **Salvar**.

A listagem mostra os pareceres já registrados; **busca** por aluno ou período.

---

## 7. Boletins consolidados

Menu **Boletins Consolidados** (`/boletins`).

- Escolha uma **turma** no filtro (ou "Todas as turmas").
- A tabela mostra, por aluno: **ID municipal**, **nome**, **média geral** (em
  verde se ≥ 6, vermelho se abaixo) e **status**.
- Botão **Imprimir** gera uma versão para impressão/PDF pelo navegador.

---

## 8. Mensagens e documentos

- **Mensagens** (`/messages`) — **Nova Mensagem** para falar com a coordenação,
  direção ou Secretaria; clique numa mensagem para lê-la.
- **Documentos** (`/documents`) — consulta e download de documentos
  compartilhados com você.

---

## 9. Configurações

Menu **Configurações** (`/settings`) — perfil, notificações, aparência.
Use **Sair da Conta** para encerrar a sessão.

---

## 10. Limitações conhecidas

| Área | Situação atual |
| :--- | :--- |
| **Alocação** | Você só vê turmas onde foi alocado pela SME. Não é possível se autoalocar. |
| **Boletim individual do aluno** | O menu do professor não tem uma tela de "meus alunos"; a consulta é pelos **Boletins Consolidados**. |
| **Painel do professor** | Acessível pela URL `/teacher-dashboard`, mas ainda sem link no menu. |
| **Trocar senha pela interface** | Ainda inativo — solicite à Secretaria. |
| **Boletim em PDF** | Na tela use **Imprimir**; a geração de PDF “oficial” é feita pela SME via API. |

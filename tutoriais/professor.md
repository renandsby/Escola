# 👩‍🏫 Tutorial — Professor(a)

**Perfil:** `teacher` · **Visão:** apenas as turmas em que você está alocado.

O professor usa o sistema para o **diário de classe**: lançar notas, registrar
frequência, escrever pareceres descritivos e o conteúdo ministrado das turmas
sob sua responsabilidade.

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Cabeçalho e notificações](#2-cabeçalho-e-notificações)
3. [Minhas turmas](#3-minhas-turmas)
4. [Lançar notas](#4-lançar-notas)
5. [Registrar frequência](#5-registrar-frequência)
6. [Pareceres descritivos (Educação Infantil)](#6-pareceres-descritivos-educação-infantil)
7. [Conteúdo ministrado](#7-conteúdo-ministrado)
8. [Boletins consolidados](#8-boletins-consolidados)
9. [Mensagens e documentos](#9-mensagens-e-documentos)
10. [Configurações](#10-configurações)
11. [Limitações conhecidas](#11-limitações-conhecidas)

---

## 1. Primeiro acesso

1. Sua conta é criada pela Secretaria (SME). Você recebe **usuário e senha**.
2. Abra `http://localhost:3000`, informe usuário e senha e clique em **Entrar**.
   Você cai na tela **Turmas**.
3. Troque a senha em **Configurações → Segurança → Alterar senha**. Esqueceu?
   **"Esqueci minha senha"** na tela de login.
4. O menu lateral mostra: Turmas, Notas e frequência, Pareceres descritivos,
   Conteúdo ministrado, Boletins e carteirinhas, Arquivos dos alunos e
   Mensagens e avisos.

> Se as listas de turma vierem vazias em Notas/Frequência, é porque você ainda
> **não foi alocado** em nenhuma turma. Fale com a Secretaria.

---

## 2. Cabeçalho e notificações

O **sino** no cabeçalho abre a central de notificações — por exemplo, quando
chega uma **mensagem** da coordenação. Use **"Marcar todas como lidas"**.

---

## 3. Minhas turmas

Menu **Turmas** (`/turmas`).

- Lista **somente as turmas em que você está alocado**, com nome, turno,
  escola, nº de alunos e status.
- É a partir dessas turmas que você lança notas, frequência e pareceres.

---

## 4. Lançar notas

Menu **Notas e frequência** (`/diario/lancamentos`) — aba **Notas**.

1. Clique em **Lançar Notas**.
2. Selecione no topo: **Turma**, **Disciplina** e **Período** (bimestre).
3. A lista de alunos aparece. Para cada aluno preencha **Nota**, **Nota de
   recuperação** (se houver) e **Nota final**. Notas já lançadas vêm
   preenchidas — você apenas ajusta.
4. Clique em **Salvar Notas**. Todas as linhas são gravadas de uma vez.

A tabela mostra o **histórico** de notas lançadas; use a **busca**.

> **Ano letivo encerrado:** se a SME já encerrou o ano da turma, o sistema
> recusa qualquer lançamento (`YEAR_ALREADY_CLOSED`).

---

## 5. Registrar frequência

Menu **Notas e frequência** → aba **Frequência** (`/diario/frequencia`).

1. Clique em **Lançar Frequência**.
2. Selecione **Turma**, **Disciplina** e a **data** da aula.
3. Marque, para cada aluno, **presente**, **ausente** ou **falta justificada**.
   Registros já feitos vêm marcados.
4. Clique em **Salvar Frequência**.

---

## 6. Pareceres descritivos (Educação Infantil)

Menu **Pareceres descritivos** (`/diario/pareceres`).

Para turmas de Educação Infantil (avaliação descritiva, sem nota numérica):

1. Selecione o **aluno** e o **período**.
2. Escreva o **texto do parecer**.
3. Clique em **Salvar**.

---

## 7. Conteúdo ministrado

Menu **Conteúdo ministrado** (`/diario/conteudo`) — registre o conteúdo da aula
(data, disciplina, descrição e tarefa de casa) por turma.

---

## 8. Boletins consolidados

Menu **Boletins e carteirinhas** (`/documentos/boletins`).

- Escolha uma **turma** no filtro.
- A tabela mostra, por aluno: **ID municipal**, **nome**, **média geral** (verde
  se ≥ 6, vermelho se abaixo) e **status**.
- Botão de **download do boletim (PDF)** por aluno, e **Imprimir** para a
  versão consolidada da turma.

---

## 9. Mensagens e documentos

- **Mensagens e avisos** (`/mensagens`) — **Nova Mensagem** para a coordenação,
  direção ou Secretaria.
- **Arquivos dos alunos** (`/documentos/arquivos`) — consulta dos documentos
  dos alunos das suas turmas.

---

## 10. Configurações

Menu **Configurações** (`/configuracoes`) — **Editar perfil**, **Alterar
senha**, **Autenticação em dois fatores (2FA)** e **Sair da conta**.

Em **Segurança → Autenticação em dois fatores**, ative o TOTP com um app
autenticador (Google Authenticator, Authy). Guarde os **8 códigos de backup**
mostrados na ativação — cada um vale uma vez, para o caso de você ficar sem o
app. Com o 2FA ativo, o login pede o código de 6 dígitos após usuário/senha.

---

## 11. Limitações conhecidas

| Área | Situação atual |
| :--- | :--- |
| **Alocação** | Você só vê turmas onde foi alocado pela SME — não é possível se autoalocar. |
| **"Meus alunos"** | O menu não tem uma lista dedicada; a consulta é pelos **Boletins consolidados** ou pela ficha do aluno. |
| **Ano letivo encerrado** | Lançamentos retroativos são bloqueados após o fechamento do ano pela SME. |

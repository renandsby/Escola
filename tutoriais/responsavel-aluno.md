# 👨‍👩‍👧 Tutorial — Responsável / Aluno

**Perfil:** `student_guardian` · **Visão:** apenas o(s) aluno(s) vinculado(s) a você.

O responsável (ou o próprio aluno) usa o sistema para **acompanhar a vida
escolar**: notas, boletim, frequência, comunicados da escola e documentos.

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Painel inicial](#2-painel-inicial)
3. [Acompanhar notas](#3-acompanhar-notas)
4. [Boletim do aluno](#4-boletim-do-aluno)
5. [Mensagens da escola](#5-mensagens-da-escola)
6. [Documentos](#6-documentos)
7. [Configurações](#7-configurações)
8. [Limitações conhecidas](#8-limitações-conhecidas)

---

## 1. Primeiro acesso

1. A conta é criada pela **escola** ou pela **Secretaria** e já vem **vinculada
   ao(s) aluno(s)** correspondente(s). Você recebe **usuário e senha**.
2. Abra `http://localhost:3000`, informe usuário e senha e clique em **Entrar**.
3. Você cai no **Dashboard**. O menu lateral mostra apenas: **Dashboard**,
   **Notas**, **Mensagens** e **Documentos**.

---

## 2. Painel inicial

Menu **Dashboard** — mensagem de boas-vindas e atalhos. Os cartões de totais
refletem o que você tem acesso.

---

## 3. Acompanhar notas

Menu **Notas** (`/grades`).

- A tabela mostra **apenas as notas do(s) aluno(s) vinculado(s) a você**, com
  disciplina, período e a nota efetiva.
- Use a **busca** por disciplina ou período para filtrar.

Aqui o acesso é **somente de leitura** — o lançamento é feito pelo professor.

---

## 4. Boletim do aluno

O boletim individual fica em `http://localhost:3000/students/<ID-do-aluno>` —
a escola pode te enviar esse link direto.

A tela **Boletim — Nome do Aluno** traz:

- **Notas por disciplina** (com médias)
- **Resumo de frequência**
- Botão **Imprimir** para gerar uma via em papel/PDF pelo navegador

---

## 5. Mensagens da escola

Menu **Mensagens** (`/messages`).

- A lista mostra as mensagens recebidas. Clique numa mensagem para ler o
  conteúdo completo (remetente, data, assunto e texto).
- Para enviar uma mensagem à escola, clique em **Nova Mensagem**, escolha o
  destinatário, escreva assunto e texto e clique em **Enviar**.

---

## 6. Documentos

Menu **Documentos** (`/documents`).

- Lista os documentos compartilhados com você (declarações, comunicados,
  histórico etc.).
- Clique num documento para ver os detalhes e **abrir/baixar o arquivo**.

---

## 7. Configurações

Menu **Configurações** (`/settings`) — dados de perfil e preferências.
Use **Sair da Conta** para encerrar a sessão com segurança, principalmente em
computadores compartilhados.

---

## 8. Limitações conhecidas

| Área | Situação atual |
| :--- | :--- |
| **"Meus alunos"** | Não há uma lista de alunos vinculados no menu; o boletim é acessado pelo **link direto** que a escola fornece (`/students/<id>`). |
| **Frequência e pareceres** | Não aparecem no menu do responsável — o resumo de frequência está dentro do **Boletim** do aluno. |
| **Boletim em PDF oficial** | Na tela use **Imprimir**; a via oficial em PDF é emitida pela escola/Secretaria. |
| **Trocar senha pela interface** | Ainda inativo — solicite à escola. |

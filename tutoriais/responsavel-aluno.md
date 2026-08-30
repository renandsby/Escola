# 👨‍👩‍👧 Tutorial — Responsável / Aluno

**Perfil:** `student_guardian` · **Visão:** apenas o(s) aluno(s) vinculado(s) a você.

O responsável (ou o próprio aluno) acompanha a **vida escolar**: notas, boletim,
frequência, comunicados da escola e documentos — tudo em um layout pensado
para celular.

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Meus filhos (painel da família)](#2-meus-filhos-painel-da-família)
3. [Boletim do aluno](#3-boletim-do-aluno)
4. [Documentos](#4-documentos)
5. [Mensagens da escola](#5-mensagens-da-escola)
6. [Notificações](#6-notificações)
7. [Configurações e privacidade](#7-configurações-e-privacidade)
8. [Limitações conhecidas](#8-limitações-conhecidas)

---

## 1. Primeiro acesso

1. A conta é criada pela **escola** ou pela **Secretaria** e já vem **vinculada
   ao(s) aluno(s)** correspondente(s). Você recebe **usuário e senha**.
2. Abra `http://localhost:3000`, informe usuário e senha e clique em **Entrar**.
3. Você cai em **Meus filhos**. O menu lateral mostra: **Meus filhos**,
   **Boletins e carteirinhas**, **Arquivos dos alunos** e **Mensagens e avisos**.

> Esqueceu a senha? Use **"Esqueci minha senha"** na tela de login — chega um
> link de redefinição no e-mail cadastrado (válido por 2 horas).

---

## 2. Meus filhos (painel da família)

Menu **Meus filhos** (`/`).

Um **cartão por estudante** vinculado a você, com:

- **turma, turno e escola**;
- **média geral** e **frequência** — destacadas em vermelho quando abaixo do
  mínimo da rede;
- botão **Baixar boletim** (PDF oficial);
- botão **Falar com a coordenação** (abre uma nova mensagem).

Se você tem mais de um filho, todos aparecem lado a lado (ou empilhados no
celular). Cada um só mostra os **seus próprios** dados.

---

## 3. Boletim do aluno

Além do botão **Baixar boletim** no cartão, a ficha completa fica em
**Boletins e carteirinhas** (`/documentos/boletins`) ou no link direto
`/alunos/<ID-do-aluno>` que a escola pode te enviar.

A ficha traz **notas por disciplina**, **resumo de frequência** e o botão de
**download do boletim em PDF**.

---

## 4. Documentos

Menu **Arquivos dos alunos** (`/documentos/arquivos`).

Lista os documentos do(s) seu(s) filho(s) (declarações, comprovantes,
histórico etc.). Clique num item para **abrir/baixar o arquivo**. Você **não**
vê documentos de alunos de outras famílias.

---

## 5. Mensagens da escola

Menu **Mensagens e avisos** (`/mensagens`).

- A lista mostra as mensagens recebidas — clique para ler o conteúdo completo.
- Para escrever à escola, **Nova Mensagem**: escolha o destinatário, o assunto e
  o texto e clique em **Enviar**.

---

## 6. Notificações

O **sino** no cabeçalho mostra avisos do sistema (nova mensagem, por exemplo),
com contador de não lidas e a opção **"Marcar todas como lidas"**.

---

## 7. Configurações e privacidade

Menu **Configurações** (`/configuracoes`):

- **Editar perfil** — telefone e e-mail.
- **Alterar senha** — exige a senha atual.
- **Privacidade e dados (LGPD)** — para cada filho, o botão **Baixar dados
  cadastrais (LGPD)** gera um arquivo com o que a rede mantém sobre ele
  (cadastro, notas, frequência, documentos e consentimentos).
- **Sair da conta** — importante em computadores compartilhados.

---

## 8. Limitações conhecidas

| Área | Situação atual |
| :--- | :--- |
| **Lançamento de notas/frequência** | Somente leitura para o responsável — o lançamento é do professor. |
| **Registro de consentimentos** | Hoje é feito pela escola/Secretaria na ficha do aluno; pelo portal, o responsável consegue **baixar** os dados, mas não editar os consentimentos. |
| **Notificações por e-mail/WhatsApp** | Apenas avisos in-app (sino). O e-mail é usado só na redefinição de senha. |

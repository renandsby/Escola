# 👨‍👩‍👧 Tutorial — Responsável / Aluno

**Perfil:** `student_guardian` · **Visão:** apenas o(s) aluno(s) vinculado(s) a você.

O responsável (ou o próprio aluno) acompanha a **vida escolar**: notas, boletim,
frequência, comunicados da escola e documentos — tudo em um layout pensado
para celular.

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Vincular um estudante à sua conta](#2-vincular-um-estudante-à-sua-conta)
3. [Meus filhos (painel da família)](#3-meus-filhos-painel-da-família)
4. [Boletim do aluno](#4-boletim-do-aluno)
5. [Documentos](#5-documentos)
6. [Mensagens da escola](#6-mensagens-da-escola)
7. [Notificações](#7-notificações)
8. [Configurações e privacidade](#8-configurações-e-privacidade)
9. [Limitações conhecidas](#9-limitações-conhecidas)

---

## 1. Primeiro acesso

Há **dois caminhos** para ter acesso:

### A. A escola criou a sua conta

A escola ou a Secretaria cria a conta já **vinculada ao(s) aluno(s)** e informa
o **CPF** (ou e-mail) e a senha. Abra `http://localhost:3000`, digite **CPF ou
e-mail** e a senha e clique em **Entrar**.

### B. Você mesmo cria a conta (auto-cadastro)

1. Na tela de login, clique em **"É responsável e ainda não tem acesso? Criar
   conta"** (`/cadastro-responsavel`).
2. Preencha **nome completo, CPF, telefone, e-mail e senha**. Se o site pedir,
   confirme a verificação **anti-robô**.
3. Ao concluir, você já entra no sistema, mas com **acesso restrito**: antes de
   ver notas, frequência e documentos é preciso **confirmar o e-mail**.
4. Abra o e-mail que enviamos e clique no **link de confirmação** (vale 3 dias).
   Não chegou? Na tela "Confirmação de e-mail" use **"Reenviar link"**.
5. Depois de confirmar, falta **vincular o estudante** à sua conta — veja a
   seção 2.

> **Login:** funciona tanto com **CPF** quanto com **e-mail** — os dois são
> únicos por pessoa.
>
> Esqueceu a senha? Use **"Esqueci minha senha"** na tela de login — chega um
> link de redefinição no e-mail cadastrado (válido por 2 horas).

O menu lateral do responsável mostra: **Meus filhos**, **Boletins e
carteirinhas**, **Arquivos dos alunos** e **Mensagens e avisos**.

---

## 2. Vincular um estudante à sua conta

Se a sua conta ainda não tem nenhum aluno (ou você precisa adicionar outro
filho), abra **Meus filhos** e clique em **Vincular estudante**. Há duas formas —
ambas exigem provar o parentesco, para proteger os dados do menor:

### Opção 1 — Tenho um código (mais rápido)

Peça à **secretaria da escola** um **código de vinculação**. Na janela, aba
**"Tenho um código"**, informe o **CPF do estudante** e o **código**
(formato `XXXX-XXXX`). O vínculo é confirmado **na hora**.

> O código vale por **72 horas** e só pode ser usado **uma vez**.

### Opção 2 — Solicitar à escola

Na aba **"Solicitar à escola"**, informe o **CPF do estudante**, a **data de
nascimento** e o **nome completo da mãe**, exatamente como constam no cadastro
do aluno. Escolha o parentesco e envie.

- Se os dados conferem, a solicitação fica **aguardando a escola**. O estudante
  aparece em "Meus filhos" com o aviso *"aguardando confirmação da escola"* e
  **sem** dados escolares.
- A escola aprova ou recusa. Se recusar, o motivo aparece no cartão.

### O estudante não está na rede

Se a escola informar que não há cadastro do aluno, o caminho é **solicitar uma
vaga** (matrícula nova) — não é possível criar a ficha do aluno pelo portal. Use
**Matrícula e rematrícula** no topo de "Meus filhos".

---

## 3. Meus filhos (painel da família)

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

## 4. Boletim do aluno

Além do botão **Baixar boletim** no cartão, a ficha completa fica em
**Boletins e carteirinhas** (`/documentos/boletins`) ou no link direto
`/alunos/<ID-do-aluno>` que a escola pode te enviar.

A ficha traz **notas por disciplina**, **resumo de frequência** e o botão de
**download do boletim em PDF**.

---

## 5. Documentos

Menu **Arquivos dos alunos** (`/documentos/arquivos`).

Lista os documentos do(s) seu(s) filho(s) (declarações, comprovantes,
histórico etc.). Clique num item para **abrir/baixar o arquivo**. Você **não**
vê documentos de alunos de outras famílias.

---

## 6. Mensagens da escola

Menu **Mensagens e avisos** (`/mensagens`).

- A lista mostra as mensagens recebidas — clique para ler o conteúdo completo.
- Para escrever à escola, **Nova Mensagem**: escolha o destinatário, o assunto e
  o texto e clique em **Enviar**.

---

## 7. Notificações

O **sino** no cabeçalho mostra avisos do sistema (nova mensagem, por exemplo),
com contador de não lidas e a opção **"Marcar todas como lidas"**.

---

## 8. Configurações e privacidade

Menu **Configurações** (`/configuracoes`):

- **Editar perfil** — telefone e e-mail. (Trocar o e-mail pode exigir nova
  confirmação.)
- **Alterar senha** — exige a senha atual.
- **Autenticação em dois fatores (2FA)** — ative o TOTP com um app autenticador
  (Google Authenticator, Authy) para exigir um código de 6 dígitos no login,
  além da senha. Guarde os **8 códigos de backup** da ativação — cada um serve
  uma vez, caso você fique sem o celular.
- **Privacidade e dados (LGPD)** — para cada filho, o botão **Baixar dados
  cadastrais (LGPD)** gera um arquivo com o que a rede mantém sobre ele
  (cadastro, notas, frequência, documentos e consentimentos).
- **Sair da conta** — importante em computadores compartilhados.

---

## 9. Limitações conhecidas

| Área | Situação atual |
| :--- | :--- |
| **Lançamento de notas/frequência** | Somente leitura para o responsável — o lançamento é do professor. |
| **Registro de consentimentos** | Hoje é feito pela escola/Secretaria na ficha do aluno; pelo portal, o responsável consegue **baixar** os dados, mas não editar os consentimentos. |
| **Verificação anti-robô (CAPTCHA)** | Aparece no auto-cadastro só quando a rede tem a chave configurada; em ambiente de demonstração fica desligada. |
| **Notificações por e-mail/WhatsApp** | Avisos do dia a dia são só in-app (sino). O e-mail é usado na redefinição de senha e na **confirmação de conta** do auto-cadastro. |

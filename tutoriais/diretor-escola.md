# 🏫 Tutorial — Diretor(a) de Escola

**Perfil:** `school_director` · **Visão:** apenas a sua unidade escolar.

O diretor gerencia os dados **da própria escola**: turmas, salas, alunos,
matrículas, documentos, transferências recebidas e o desempenho pedagógico. O
cadastro de escolas, professores e disciplinas é feito pela Secretaria (SME).

> O papel **`school_secretary`** (secretário escolar) tem as mesmas telas
> voltadas a alunos, matrículas e documentos.

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Cabeçalho e notificações](#2-cabeçalho-e-notificações)
3. [Painel inicial](#3-painel-inicial)
4. [Dados da escola](#4-dados-da-escola)
5. [Turmas e salas](#5-turmas-e-salas)
6. [Alunos, documentos e privacidade](#6-alunos-documentos-e-privacidade)
7. [Matrículas](#7-matrículas)
8. [Transferências recebidas](#8-transferências-recebidas)
9. [Acompanhamento pedagógico](#9-acompanhamento-pedagógico)
10. [Boletins e documentos](#10-boletins-e-documentos)
11. [Comunicação](#11-comunicação)
12. [Configurações](#12-configurações)
13. [Limitações conhecidas](#13-limitações-conhecidas)

---

## 1. Primeiro acesso

1. Abra `http://localhost:3000`, informe o **usuário e senha** fornecidos pela
   Secretaria e clique em **Entrar**. Você cai no **Dashboard**, com os dados
   **da sua escola**.
2. Troque a senha em **Configurações → Segurança → Alterar senha**. Esqueceu?
   Use **"Esqueci minha senha"** na tela de login.
3. O menu lateral mostra apenas as áreas do seu papel.

---

## 2. Cabeçalho e notificações

O **sino** no cabeçalho abre a central de notificações — você é avisado, por
exemplo, quando uma **transferência** para a sua escola precisa de aceite ou
quando chega uma **mensagem**. Use **"Marcar todas como lidas"** e clique na
notificação para ir direto à tela do evento.

---

## 3. Painel inicial

Menu **Dashboard gerencial** (`/`) — KPIs e gráficos **da sua escola**:
matrículas ativas, completude do diário (por turma), frequência, rendimento por
etapa e a lista **Precisa de você** com as pendências da unidade.

---

## 4. Dados da escola

Menu **Escolas e salas** (`/escolas`).

- A listagem mostra **somente a sua escola**.
- ✏️ **edita** contato (e-mail, telefone, site), endereço e capacidade padrão
  de alunos por turma.
- O **tipo da escola** e o vínculo com a Secretaria são definidos pela SME.

---

## 5. Turmas e salas

Menu **Turmas** (`/turmas`).

- Lista as turmas da sua escola: nome, turno, escola, nº de alunos e status.
- **Nova turma** → nome, ano letivo, matriz curricular, turno, **capacidade
  máxima (> 0)** e sala. A **escola já vem travada na sua unidade** — você não
  cria turma para outra escola. ✏️ edita a turma.
- Botão **Salas de aula** (`/salas`) → **Nova sala**: número/identificação,
  capacidade (**> 0**), andar e bloco.

---

## 6. Alunos, documentos e privacidade

Menu **Alunos** (`/alunos`) — **restrito à sua escola**.

- **Novo Aluno** → nome completo, ID municipal, nome da mãe, data de nascimento
  (obrigatórios) e Secretaria; complete CPF, gênero, raça/cor, necessidades
  especiais (AEE) etc.
- Ícone 👁️ abre a **ficha do aluno**: cadastral, notas, frequência e:
  - **Documentos** — **Enviar documento** (arrastar-e-soltar; PDF/PNG/JPG/JPEG/
    DOCX até 15 MB);
  - **Privacidade e dados (LGPD)** — registrar consentimentos e **baixar os
    dados cadastrais** do aluno;
  - **Emitir Boletim** e **Emitir Carteirinha** (PDF oficial).

---

## 7. Matrículas

Menu **Matrículas** (`/matriculas`).

- **Nova Matrícula** → aluno, turma **da sua escola** e número da matrícula.
- **Não** é permitida uma segunda matrícula ativa para o mesmo aluno no mesmo
  ano letivo; a matrícula é recusada se a turma atingiu a **capacidade máxima**.

---

## 8. Transferências recebidas

Menu **Transferências** (`/transferencias`).

Quando uma transferência é **autorizada pela SME** e a **sua escola é o
destino**, a solicitação aparece com o botão **Efetivar matrícula e aceitar**:

1. Clique no botão — abre um modal para escolher a **turma de destino** na sua
   escola.
2. Ao confirmar, o sistema **encerra a matrícula na escola de origem** e **cria
   a nova matrícula** na turma escolhida (operação atômica: turma sem vaga →
   nada muda).

Você também pode **Recusar** a transferência nesta etapa. A solicitação e a
autorização inicial continuam sendo feitas pela SME.

---

## 9. Acompanhamento pedagógico

O diário de classe **da sua escola**:

| Menu | O que mostra |
| :--- | :--- |
| **Notas e frequência** (`/diario/lancamentos`) | Notas e frequência lançadas pelos professores; abas alternam entre notas, frequência e histórico |
| **Pareceres descritivos** (`/diario/pareceres`) | Pareceres da Educação Infantil |
| **Conteúdo ministrado** (`/diario/conteudo`) | Registros de aula |

O **lançamento** é do professor; o diretor acompanha.

---

## 10. Boletins e documentos

- **Boletins e carteirinhas** (`/documentos/boletins`) — consolidação por
  turma (média geral e status de cada aluno) e **download do boletim oficial
  (PDF)** por aluno.
- **Arquivos dos alunos** (`/documentos/arquivos`) — documentos dos alunos da
  escola; botão **Enviar documento**.
- **Exportações** (`/documentos/exportacoes`) — relatório de rendimento da
  escola em Excel/CSV.

---

## 11. Comunicação

**Mensagens e avisos** (`/mensagens`) — **Nova Mensagem** para professores e a
Secretaria; o destinatário recebe uma notificação.

---

## 12. Configurações

Menu **Configurações** (`/configuracoes`) — **Editar perfil**, **Alterar
senha** e **Sair da conta**.

---

## 13. Limitações conhecidas

| Área | Situação atual |
| :--- | :--- |
| **Cadastro de professores e disciplinas** | Exclusivo da SME. O diretor consulta o resultado (turmas, alocações, notas). |
| **Solicitação/autorização de transferência** | A solicitação e a 1ª autorização são da SME. O diretor da escola de destino só faz o **aceite** (ou recusa). |
| **Fechamento de ano letivo** | Operação da SME. |
| **Autenticação em dois fatores (2FA)** | Fora de escopo desta fase. |

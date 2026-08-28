# 🏛️ Tutorial — Administrador da Secretaria Municipal (SME)

**Perfil:** `sme_admin` · **Visão:** toda a rede municipal.

O administrador é quem **estrutura a rede** no sistema: escolas, quadro docente,
disciplinas, alunos, matrículas e o acompanhamento pedagógico de todas as
unidades.

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Painel inicial](#2-painel-inicial)
3. [Dados da Secretaria](#3-dados-da-secretaria)
4. [Escolas](#4-escolas)
5. [Disciplinas e matrizes curriculares](#5-disciplinas-e-matrizes-curriculares)
6. [Cadastro de professores](#6-cadastro-de-professores)
7. [Alocação de professores em turmas](#7-alocação-de-professores-em-turmas)
8. [Cadastro de alunos](#8-cadastro-de-alunos)
9. [Matrículas](#9-matrículas)
10. [Transferências entre escolas](#10-transferências-entre-escolas)
11. [Acompanhamento pedagógico](#11-acompanhamento-pedagógico)
12. [Comunicação e documentos](#12-comunicação-e-documentos)
13. [Configurações](#13-configurações)
14. [Limitações conhecidas](#14-limitações-conhecidas)

---

## 1. Primeiro acesso

1. Abra `http://localhost:3000`.
2. Informe **usuário** e **senha** (na base de exemplo: `admin` / `admin123`).
3. Clique em **Entrar**. Você cai no **Dashboard**.
4. O menu lateral escuro (à esquerda) lista todas as áreas disponíveis. O botão
   `‹` no topo recolhe/expande o menu.

> **Dica de segurança:** troque a senha padrão. Hoje a troca de senha pela tela
> de Configurações ainda não está ativa — use a área administrativa
> (`/admin/` → *Users*) ou o endpoint `POST /api/v1/accounts/users/change_password/`.

---

## 2. Painel inicial

Menu **Dashboard**.

- Quatro cartões com os totais **da rede**: **Alunos**, **Turmas**,
  **Disciplinas** e **Escolas**. Cada cartão é um atalho para a listagem
  correspondente.
- **Atividade Recente** — lista de ações registradas (ver limitações).
- **Menu Rápido** — atalhos para Secretaria, Matrizes, Transferências e Alunos.

---

## 3. Dados da Secretaria

Menu **Secretaria** (`/sme`).

- Exibe o município, código IBGE, secretário(a) e os parâmetros da rede
  (nota mínima para aprovação, frequência mínima).
- Abaixo, a **lista de todas as escolas** da rede com nome, INEP, tipo e cidade.

---

## 4. Escolas

Menu **Escolas** (`/schools`).

### Consultar

- A tabela lista as escolas com nome, INEP, tipo e cidade.
- Use a **busca** (por nome ou código INEP).

### Cadastrar uma escola

1. Clique em **Nova Escola**.
2. Preencha:
   - **Nome** (obrigatório)
   - **Secretaria Municipal** (obrigatório — selecione a SME)
   - **Tipo** — Creche, Pré-escola, Fundamental I, Fundamental II, EJA ou Mista
   - **Diretor(a)** — selecione entre os usuários com papel de diretor (opcional)
   - **Código INEP**, **CNPJ**, **e-mail**, **telefone**
   - Endereço: logradouro, número, bairro, cidade, UF, CEP
3. Clique em **Criar**. Uma notificação confirma o cadastro.

### Editar / remover

- Botão ✏️ na linha abre o formulário de edição.
- Botão 🗑️ remove a escola (exclusão lógica — o registro é desativado, não apagado).

---

## 5. Disciplinas e matrizes curriculares

### Disciplinas — menu **Disciplinas** (`/subjects`)

1. **Nova Disciplina**.
2. Preencha **Nome**, **Área do conhecimento** (Linguagens, Matemática,
   Ciências da Natureza, Ciências Humanas, Ensino Religioso), **Código BNCC**
   (opcional), **Secretaria** e **nota mínima**.
3. **Salvar**.

As disciplinas são da **rede** (não de uma escola específica) e alimentam as
matrizes curriculares e a alocação de professores.

### Matrizes curriculares — menu **Matrizes** (`/sme/matrices`)

- Tela de **consulta** das matrizes por etapa de ensino (uma matriz por etapa:
  Educação Infantil, Fundamental Anos Iniciais, Fundamental Anos Finais, EJA),
  com a etapa e o status.
- A criação/edição de matriz e a definição da carga horária por disciplina são
  feitas na carga inicial (`seed_censo_igarassu`) ou via API/área administrativa.

---

## 6. Cadastro de professores

Menu **Professores** (`/teachers`).

### Consultar

- Tabela com matrícula funcional, nome, área de formação e status.
- **Busca** por nome, matrícula, CPF ou área de formação.

### Cadastrar um professor

1. Clique em **Novo Professor**.
2. Preencha em uma única tela:
   - **Dados de acesso:** nome, sobrenome, e-mail, **usuário de acesso**,
     **senha** e **confirmação de senha**
   - **Secretaria Municipal**
   - **Dados funcionais:** matrícula funcional, **CPF** (11 dígitos),
     área de formação, data de nascimento, data de contratação
3. Clique em **Salvar**. O sistema cria **o usuário** (papel professor) **e o
   perfil docente** em sequência.

> O professor já pode entrar no sistema com o usuário/senha informados.

### Editar / remover

- ✏️ edita **apenas os dados funcionais** (matrícula, CPF, formação, datas). Para
  alterar nome/e-mail, use a área administrativa.
- 🗑️ remove o professor do quadro (exclusão lógica). As alocações associadas
  também deixam de valer.

---

## 7. Alocação de professores em turmas

Menu **Alocações** (`/teachers/allocations`) — ou o botão **Alocações** na tela
de Professores.

### Consultar

- Tabela: professor, turma, disciplina e se é regente.
- **Busca** por professor, turma ou disciplina.

### Criar uma alocação

1. Clique em **Nova Alocação**.
2. Selecione:
   - **Professor**
   - **Turma**
   - **Disciplina** — opcional; deixe em branco para uma alocação de
     **regente / unidocente** (comum nos Anos Iniciais)
   - Marque **Professor regente da turma** se aplicável
3. Clique em **Alocar**.

### Regras automáticas

O sistema **recusa** a alocação e mostra um aviso quando:

- **Conflito de turno:** o professor já está alocado em outra turma cujo turno
  se sobrepõe no mesmo ano letivo (não é possível reger duas salas ao mesmo
  tempo). `Integral` conflita com manhã e com tarde.
- **Alocação duplicada:** já existe o vínculo *professor + turma + disciplina*.

Um mesmo professor **pode** lecionar disciplinas diferentes na mesma turma, e
turmas em turnos diferentes.

### Remover

- Botão 🗑️ na linha da alocação.

---

## 8. Cadastro de alunos

Menu **Alunos** (`/students`).

### Consultar

- Tabela com ID municipal, nome, nome da mãe e status.
- **Busca** por nome, ID municipal ou nome da mãe.

### Cadastrar um aluno (cadastro único)

1. Clique em **Novo Aluno**.
2. Preencha:
   - **Nome completo**, **ID municipal**, **nome da mãe**,
     **data de nascimento** (obrigatórios)
   - **Secretaria Municipal**
   - Opcionais: nome social, CPF, gênero, nome do pai, código INEP, NIS,
     raça/cor, necessidades especiais (marque a opção e descreva)
3. **Salvar**.

O aluno fica no **cadastro único da rede** — a partir daí ele é matriculado em
uma turma (passo seguinte).

### Boletim individual

- Clique no aluno (ícone 👁️) para abrir **Boletim — Nome do Aluno**: notas por
  disciplina, resumo de frequência e botão **Imprimir**.

---

## 9. Matrículas

Menu **Matrículas** (`/enrollments`).

### Consultar

- Tabela com número da matrícula, aluno, turma e status. É possível **alterar o
  status** de uma matrícula pela própria listagem.

### Matricular um aluno

1. Clique em **Nova Matrícula**.
2. Selecione o **Aluno**, a **Turma** e informe o **número da matrícula**
   (ex.: `MAT2026000123`).
3. **Salvar**.

### Regras automáticas

- **Matrícula ativa duplicada:** o sistema recusa uma segunda matrícula ativa
  para o mesmo aluno **no mesmo ano letivo**.
- **Capacidade da turma:** a matrícula é recusada se a turma já atingiu a
  capacidade máxima.

---

## 10. Transferências entre escolas

Menu **Transferências** (`/sme/transfers`).

### Fluxo

1. **Solicitação** — clique em **Nova Transferência**, informe aluno, escola de
   origem, escola de destino, ano letivo e motivo, e clique em
   **Criar Solicitação**. A solicitação nasce *pendente na SME*.
2. **Autorização (SME)** — na listagem, use a ação **Autorizar** na solicitação
   pendente. Confirme no diálogo.
3. **Aceite (escola de destino)** — a escola de destino aceita a transferência
   (ação **Aceitar**). Só a unidade de destino pode aceitar.

O administrador pode acompanhar todas as etapas nesta tela.

---

## 11. Acompanhamento pedagógico

O administrador tem visão **de toda a rede** nas telas do diário de classe:

| Menu | O que mostra |
| :--- | :--- |
| **Notas** (`/grades`) | Todas as notas lançadas; filtro/busca por aluno, disciplina, período |
| **Frequência** (`/attendance`) | Registros de frequência de toda a rede |
| **Pareceres** (`/evaluations`) | Pareceres descritivos (Educação Infantil) |
| **Boletins Consolidados** (`/boletins`) | Consolidação por turma: média geral e status de cada aluno; botão **Imprimir** |

O lançamento de notas/frequência/pareceres é feito pelo **professor** (ver
[tutorial do professor](professor.md)); o administrador acompanha o resultado.

---

## 12. Comunicação e documentos

- **Mensagens** (`/messages`) — **Nova Mensagem**: escolha o destinatário,
  assunto e corpo; clique em **Enviar**. Clique numa mensagem da lista para lê-la.
- **Documentos** (`/documents`) — consulta e download de documentos; abrir um
  item mostra os detalhes e o botão para abrir o arquivo.

---

## 13. Configurações

Menu **Configurações** (`/settings`) — perfil, preferências de notificação,
aparência e segurança. Botão **Sair da Conta** encerra a sessão.

---

## 14. Limitações conhecidas

| Área | Situação atual |
| :--- | :--- |
| **Turmas** | Não há tela para *criar* turma. As turmas vêm da carga do Censo (`seed_censo_igarassu`); novas turmas são criadas via API (`POST /api/v1/classes/`) ou pela área administrativa (`/admin/`). |
| **Boletim/carteirinha em PDF** | Gerados apenas pelos endpoints da API (`/api/v1/reports/boletim_pdf/`, `/carteirinha_pdf/`, `/relatorio_excel/`, `/educacenso-export/`) — ainda sem botão na interface. Na tela, use **Imprimir** (boletim consolidado e boletim individual). |
| **Trocar senha / editar perfil / 2FA** | Botões presentes em Configurações, mas ainda sem ação. Use a área administrativa. |
| **Matrizes curriculares** | Tela somente de leitura; criação/edição via carga inicial ou API. |
| **Trilha de auditoria** | O bloco "Atividade Recente" do Dashboard depende de registros de auditoria que ainda não são gravados automaticamente. |

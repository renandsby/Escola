# 🏛️ Tutorial — Administrador da Secretaria Municipal (SME)

**Perfil:** `sme_admin` · **Visão:** toda a rede municipal.

O administrador é quem **estrutura a rede** no sistema: escolas, salas, quadro
docente, disciplinas, alunos, matrículas, **usuários** e o acompanhamento
pedagógico de todas as unidades — além de operações de rede como o
**fechamento do ano letivo** e a **exportação do Educacenso**.

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Cabeçalho, notificações e menu](#2-cabeçalho-notificações-e-menu)
3. [Dashboard gerencial](#3-dashboard-gerencial)
4. [Ano letivo, bimestres e fechamento](#4-ano-letivo-bimestres-e-fechamento)
5. [Escolas e salas de aula](#5-escolas-e-salas-de-aula)
6. [Currículo e matrizes](#6-currículo-e-matrizes)
7. [Professores e alocações](#7-professores-e-alocações)
8. [Alunos, documentos e privacidade (LGPD)](#8-alunos-documentos-e-privacidade-lgpd)
9. [Matrículas](#9-matrículas) · [Matrícula e rematrícula online (admissões)](#matrícula-e-rematrícula-online-admissões)
10. [Transferências entre escolas](#10-transferências-entre-escolas)
11. [Turmas](#11-turmas)
12. [Acompanhamento pedagógico](#12-acompanhamento-pedagógico)
13. [Documentos, boletins e exportações](#13-documentos-boletins-e-exportações)
14. [Educacenso](#14-educacenso)
15. [Usuários da Rede](#15-usuários-da-rede)
16. [Comunicação](#16-comunicação)
17. [Configurações](#17-configurações)
18. [Limitações conhecidas](#18-limitações-conhecidas)

---

## 1. Primeiro acesso

1. Abra `http://localhost:3000`.
2. Informe **CPF ou e-mail** e a **senha** (na carga de demonstração:
   `admin` / `admin123` — o login também aceita o CPF do usuário).
3. Clique em **Entrar**. Você cai no **Dashboard gerencial**.
4. **Troque a senha padrão:** menu **Configurações → Segurança → Alterar senha**.
   Se esquecer a senha, use **"Esqueci minha senha"** na tela de login — o
   sistema envia um link de redefinição (válido por 2 h) para o e-mail cadastrado.

---

## 2. Cabeçalho, notificações e menu

- O **cabeçalho institucional** (barra escura no topo) mostra a identidade da
  rede, o **ano letivo / bimestre corrente**, o **sino de notificações** e o
  **menu do usuário** (canto direito).
- **Sino** → abre a central de notificações: badge com o número de não lidas,
  botão **"Marcar todas como lidas"** e clique numa notificação leva à tela do
  evento (ex.: transferência, mensagem).
- O **menu lateral** escuro (à esquerda) lista as áreas disponíveis, agrupadas
  em: `REDE`, `PESSOAS`, `VIDA ESCOLAR`, `DIÁRIO DE CLASSE`, `DOCUMENTOS`,
  `COMUNICAÇÃO` e `ADMINISTRAÇÃO`. O botão de menu no topo recolhe/expande a
  barra (tecla `[`).

---

## 3. Dashboard gerencial

Menu **Dashboard gerencial** (`/`).

- **Filtros no topo** — **Ano letivo** (qualquer ano cadastrado na rede) e
  **Período**: *Todos os bimestres* (padrão, agrega o ano inteiro) ou 1º a 4º
  bimestre. Ao escolher um bimestre, a frequência média, o indicador "abaixo de
  75 %", o rendimento por etapa e a completude do diário passam a considerar só
  aquele período. Há ainda **Etapa de ensino**, **Turno** e o alternador
  **Rede / Escola**. Os filtros ficam na URL — dá para compartilhar o link.
- **KPIs da rede** — matrículas ativas, completude do diário, frequência,
  alunos abaixo do mínimo. Cada KPI é um atalho para a listagem filtrada.
- **Gráficos** — tendência de frequência (ano corrente × ano anterior),
  rendimento por etapa, matrículas por etapa/turno e movimentação
  (transferências, evasão).
- **Completude do diário** — tabela por escola (ou por turma, no escopo de uma
  escola) com % de notas lançadas e frequência média, sinalizando turmas
  críticas.
- **Precisa de você** e **Atividade recente na rede** — pendências e as últimas
  ações registradas na **trilha de auditoria** (logins, cadastros, edições).

---

## 4. Ano letivo, bimestres e fechamento

Menu **Ano letivo e bimestres** (`/ano-letivo`).

- Mostra município, código IBGE, secretário(a) e os **parâmetros da rede**
  (nota mínima para aprovação, frequência mínima).
- Tabela **Anos letivos e bimestres** — cada ano com status (Ativo / Planejado /
  Encerrado), vigência e nº de bimestres.

### Criar e editar anos letivos e bimestres

Somente `sme_admin`.

1. **Novo ano letivo** → informe o **ano**, o **status** (comece em *Planejado*)
   e a **vigência** (início e término). O início precisa cair no ano informado e
   o término ser posterior ao início.
2. Na linha do ano, o ícone de **calendário** abre os **bimestres**; o **lápis**
   edita o ano.
3. Em **Bimestres**, use **Novo bimestre** → **nome** ("1º Bimestre"), **número**
   (1 a 12), **datas** (dentro da vigência do ano) e o **prazo de lançamento de
   notas** (igual ou posterior ao término do bimestre). O número não se repete
   no mesmo ano.
4. **Excluir** um bimestre pede confirmação. Não é possível excluir um bimestre
   com notas/pareceres lançados, nem um ano com turmas/matrículas vinculadas.
5. Quando o ano está **Encerrado**, os campos ficam bloqueados — não há mais
   edição de datas nem de bimestres.

### Encerrar o ano letivo

Na tabela **Anos letivos e bimestres**, no ano **Ativo**, clique em **Encerrar**
(somente `sme_admin`). O sistema pede confirmação em **duas etapas** (aviso do
que acontece + digitar o ano). Ao confirmar, para **cada matrícula ativa**:

- calcula a **média final** por disciplina e a **frequência global**;
- define o resultado como **Aprovado**, **Reprovado por nota** ou
  **Reprovado por frequência**, conforme os parâmetros da rede;
- **consolida o histórico escolar** do estudante;
- **trava o diário** das turmas daquele ano — nenhum lançamento retroativo de
  nota ou frequência é mais aceito.

Um bimestre ainda em aberto (data de término no futuro) impede o fechamento.

---

## 5. Escolas e salas de aula

Menu **Escolas e salas** (`/escolas`).

### Escolas

- A tabela lista as escolas (nome, INEP, tipo, cidade); use a **busca**.
- **Nova escola** → nome, Secretaria, tipo (Creche, Pré-escola, Fundamental I,
  Fundamental II, EJA ou Mista), diretor(a), código INEP, CNPJ, contato e
  endereço completo. **Criar**.
- ✏️ edita; 🗑️ **desativa** (exclusão lógica).

### Salas de aula

Botão **Salas de aula** na tela de Turmas, ou rota `/salas`.

- Tabela com sala, escola, capacidade, andar e bloco.
- **Nova sala** → escola, número/identificação, capacidade (**> 0**), andar e
  bloco. A capacidade zero ou negativa é recusada.

---

## 6. Currículo e matrizes

Menu **Currículo e matrizes**.

- **Disciplinas** — **Nova Disciplina**: nome, área do conhecimento, código
  BNCC (opcional), Secretaria e nota mínima. As disciplinas são **da rede**.
- **Matrizes** — consulta das matrizes por etapa de ensino. Criação/edição e
  carga horária por disciplina são feitas na carga inicial ou via API.

---

## 7. Professores e alocações

Menu **Professores e alocações** (`/professores`).

### Cadastrar um professor

**Novo Professor** → em uma tela: dados de acesso (nome, e-mail, usuário,
senha), Secretaria e dados funcionais (matrícula, CPF de 11 dígitos, formação,
data de nascimento, data de contratação). O sistema cria **o usuário** (papel
professor) **e o perfil docente**.

### Alocar em turmas

Botão **Alocações** (ou `/professores/alocacoes`) → **Nova Alocação**:
professor, turma, disciplina (deixe em branco para **regente / unidocente**) e
a marcação de **regente da turma**.

O sistema **recusa** a alocação quando há:

- **Conflito de turno** — o professor já rege outra turma cujo turno se
  sobrepõe no mesmo ano letivo (`Integral` conflita com manhã e tarde);
- **Alocação duplicada** — mesmo vínculo *professor + turma + disciplina*.

---

## 8. Alunos, documentos e privacidade (LGPD)

Menu **Alunos** (`/alunos`).

### Cadastro único

**Novo Aluno** → nome completo, **CPF** (11 dígitos, único na rede — é o
identificador principal do aluno), ID municipal, nome da mãe e data de
nascimento (obrigatórios); Secretaria; opcionais: nome social, gênero, nome do
pai, INEP, NIS, certidão, raça/cor, necessidades especiais (AEE).

> Para o **Educacenso** validar sem pendências, além do CPF preencha raça/cor,
> sexo e filiação de cada aluno.

### Ficha do aluno

Clique no aluno (ícone 👁️) para abrir a **ficha**: ficha cadastral, notas por
disciplina, resumo de frequência e:

- **Documentos** — botão **Enviar documento** (modal com arrastar-e-soltar):
  tipo, arquivo (**PDF, PNG, JPG, JPEG ou DOCX**, até 15 MB). Executáveis e
  arquivos com conteúdo divergente da extensão são rejeitados.
- **Privacidade e dados (LGPD)** — três chaves de consentimento (uso de dados,
  uso de imagem, comunicações); botão **Baixar dados cadastrais (LGPD)** (JSON
  com cadastro, notas, frequência, documentos e consentimentos); e, para o
  `sme_admin`, **Anonimizar aluno** — substitui nome/CPF/filiação por
  marcadores anônimos, **de forma irreversível**, preservando o histórico
  acadêmico. Só permitido para aluno **sem matrícula ativa**.
- **Código de vínculo** — gera um código de uso único (validade 72 h) para um
  responsável vincular esse aluno à conta dele no auto-cadastro do portal. A
  fila de solicitações de vínculo (quando o responsável não tem código) fica em
  **Responsáveis → Solicitações de vínculo** (`/responsaveis/solicitacoes-vinculo`).
- Botões **Emitir Boletim** e **Emitir Carteirinha** (PDF oficial, com QR Code
  na carteirinha).

Toda exportação/consulta de dados pessoais gera registro na trilha de auditoria.

---

## 9. Matrículas

Menu **Matrículas** (`/matriculas`).

- **Nova Matrícula** → aluno, turma e número da matrícula.
- **Matrícula ativa duplicada** no mesmo ano letivo é recusada
  (`DUPLICATE_ENROLLMENT`).
- **Capacidade da turma** excedida é recusada (`CLASS_CAPACITY_EXCEEDED`).

### Matrícula e rematrícula online (admissões)

O menu **Admissões** reúne o fluxo digital:

- **Ciclos de admissão** (`/admissoes/ciclos`) — a SME abre a janela de
  rematrícula/inscrição por ano letivo.
- **Rematrículas** (`/admissoes/rematriculas`) — a escola *materializa* a lista
  de alunos ativos; o responsável confirma permanência ou saída pelo portal e a
  escola efetiva a matrícula do ano seguinte.
- **Comprovantes de prioridade** (`/admissoes/comprovantes`) — fila de análise
  dos anexos (irmão na escola, proximidade, vulnerabilidade) das solicitações de
  vaga de alunos novos.

> A **distribuição automática de vagas** (algoritmo de alocação) está planejada
> e ainda não foi implementada — ver `.docs/PLANO_DE_EXECUCAO_ADMISSOES_V2_ALOCACAO.md`.

---

## 10. Transferências entre escolas

Menu **Transferências** (`/transferencias`).

### Fluxo

1. **Solicitação** — **Nova Transferência**: aluno, escola de origem, escola de
   destino, ano letivo e motivo. Nasce *pendente na SME*.
2. **Autorização (SME)** — botão **Autorizar** na solicitação pendente (ou
   **Recusar**).
3. **Efetivação (escola de destino)** — botão **Efetivar matrícula e aceitar**:
   abre um modal para escolher a **turma de destino**. Ao confirmar, o sistema
   **encerra a matrícula de origem** (`TRANSFERRED_INTERNAL` / `EXTERNAL`) e
   **cria a nova matrícula** na turma escolhida — tudo atômico (turma sem vaga
   → nada é alterado). Também é possível **Recusar** nesta etapa.

O `sme_admin` pode efetuar o aceite por qualquer escola. Cada etapa gera
notificação para a direção da origem, do destino e para a SME.

---

## 11. Turmas

Menu **Turmas** (`/turmas`).

- Lista turma, turno, escola, nº de alunos e status; **busca**.
- **Nova turma** → nome, escola, ano letivo, matriz curricular, turno,
  **capacidade máxima (> 0)** e sala de aula (opcional). ✏️ edita a turma.
- **Salas de aula** → ver [seção 5](#5-escolas-e-salas-de-aula).

---

## 12. Acompanhamento pedagógico

Visão **de toda a rede** no diário de classe:

| Menu | O que mostra |
| :--- | :--- |
| **Notas e frequência** (`/diario/lancamentos`) | Notas e frequência lançadas; abas no topo alternam entre notas, frequência e histórico |
| **Pareceres descritivos** (`/diario/pareceres`) | Pareceres da Educação Infantil |
| **Conteúdo ministrado** (`/diario/conteudo`) | Registros de aula dos professores |

O lançamento é feito pelo **professor** (ver [tutorial do professor](professor.md)).

---

## 13. Documentos, boletins e exportações

Grupo **DOCUMENTOS** do menu:

- **Arquivos dos alunos** (`/documentos/arquivos`) — todos os documentos da
  rede; botão **Enviar documento** (com seleção do aluno).
- **Boletins e carteirinhas** (`/documentos/boletins`) — consolidação por
  turma; **botão de download do boletim oficial (PDF)** por aluno.
- **Exportações** (`/documentos/exportacoes`) — cards de exportação rápida:
  relatório de rendimento da rede em **Excel/CSV** e a pré-exportação do
  Educacenso.

---

## 14. Educacenso

Menu **Educacenso** (`/documentos/educacenso`) — exclusivo SME.

1. A tela roda o **diagnóstico de consistência** da rede: verifica código INEP
   e endereço das escolas, CPF/data de nascimento dos docentes alocados e os
   dados obrigatórios dos alunos matriculados.
2. As pendências aparecem listadas por entidade (escola, turma, docente, aluno)
   com o que está faltando. Corrija nas telas correspondentes e clique em
   **Revalidar**.
3. Quando a rede está consistente, o botão **Baixar arquivo (ZIP)** habilita —
   o pacote traz `escolas.csv`, `turmas.csv`, `docentes.csv` e `matriculas.csv`
   (UTF-8, separador `;`).

---

## 15. Usuários da Rede

Menu **Usuários da Rede** (`/usuarios`) — exclusivo `sme_admin`.

- Tabela com nome, e-mail, papel, escola e situação; **busca** por nome/e-mail/
  CPF e filtro por papel.
- **Novo usuário** → nome, e-mail institucional, **CPF** (identificador
  principal e login da pessoa), **papel** (admin, supervisor, diretor,
  secretário, professor), **escola** (obrigatória para diretor/secretário) e
  **senha provisória** (gerada automaticamente e exibida no aviso, se deixada em
  branco). E-mail ou CPF duplicado retorna mensagem amigável. O usuário entra
  com **CPF ou e-mail**.
- Ação **ativar/desativar** — a desativação **corta o acesso imediatamente**
  (as sessões abertas do usuário param de funcionar na requisição seguinte).

---

## 16. Comunicação

**Mensagens e avisos** (`/mensagens`) — **Nova Mensagem**: destinatário,
assunto e corpo. O destinatário recebe uma **notificação** no sino.

---

## 17. Configurações

Menu **Configurações** (`/configuracoes`):

- **Perfil** — **Editar perfil** (e-mail, telefone).
- **Privacidade e dados (LGPD)** — baixar o pacote de dados de alunos no seu
  escopo.
- **Segurança** — **Alterar senha** (exige a senha atual; após a troca é
  preciso entrar de novo) e **Autenticação em dois fatores (2FA)**: ative o
  TOTP com Google Authenticator, Authy ou similar. Ao ativar, guarde os **8
  códigos de backup** (uso único). Com o 2FA ativo, todo login passa a pedir
  o código de 6 dígitos do app após usuário/senha. Perdeu o celular e os
  códigos de backup? A SME desativa o 2FA da conta pelo Django Admin
  (**Dispositivos 2FA (TOTP)**) ou pelo comando `totp_service.disable_totp`.
- **Sair da conta**.

---

## 18. Limitações conhecidas

| Área | Situação atual |
| :--- | :--- |
| **Matrizes curriculares** | Tela somente de leitura; criação/edição via carga inicial ou API. |
| **Notificações por e-mail / WhatsApp** | Apenas notificações **in-app** (sino). O e-mail é usado só na redefinição de senha. |
| **Homologação do selo INEP/MEC** | A exportação do Educacenso é para conciliação/alimentação; a homologação oficial não faz parte deste escopo. |

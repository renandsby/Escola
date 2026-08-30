/**
 * `error.code` do envelope `{ success:false, error:{ code, message, details } }`
 * → mensagem humana. Use no interceptor do Axios e nos formulários.
 *
 * Renderize com <InlineError> DENTRO do formulário quando o erro tem correção
 * possível na tela; toast (`sonner`) fica para confirmação e erro de rede.
 * O `code` deve ficar visível em mono para o suporte.
 */

export type ErrorActionKind = 'open-transfer' | 'view-class' | 'view-allocation' | 'view-failures'

export type ErrorDef = {
  title: string
  message: (details?: Record<string, unknown> | null) => string
  action?: { label: string; kind: ErrorActionKind }
}

export const ERROR_MESSAGES: Record<string, ErrorDef> = {
  // --- Matrícula ---
  DUPLICATE_ENROLLMENT: {
    title: 'Aluno já possui matrícula ativa neste ano letivo',
    message: (d) =>
      `O aluno já está matriculado em ${d?.current_class ?? 'outra turma'}. ` +
      'Para movimentá-lo, abra uma transferência.',
    action: { label: 'Abrir transferência', kind: 'open-transfer' },
  },
  CLASS_CAPACITY_EXCEEDED: {
    title: 'Turma sem vaga',
    message: (d) =>
      `A turma atingiu o limite de ${d?.max_capacity ?? 'vagas'} alunos. ` +
      'Escolha outra turma ou aumente a capacidade.',
    action: { label: 'Ver turmas com vaga', kind: 'view-class' },
  },

  // --- Alocação docente ---
  TEACHER_SCHEDULE_CONFLICT: {
    title: 'Conflito de agenda do professor',
    message: (d) =>
      `O professor já está alocado em ${d?.conflicting_class ?? 'outra turma'} ` +
      'em turno sobreposto no mesmo ano letivo.',
    action: { label: 'Ver alocações', kind: 'view-allocation' },
  },
  DUPLICATE_ALLOCATION: {
    title: 'Alocação já existe',
    message: () => 'Este professor já leciona esta disciplina nesta turma.',
  },

  // --- Transferência ---
  INVALID_STATUS_TRANSITION: {
    title: 'Ação indisponível para o status atual',
    message: () => 'A transferência não está no estado que permite esta ação.',
  },
  DESTINATION_SCHOOL_REQUIRED: {
    title: 'Escola de destino obrigatória',
    message: () => 'Informe a escola de destino antes de aceitar a transferência.',
  },
  NOT_DESTINATION_SCHOOL: {
    title: 'Somente a escola de destino pode aceitar',
    message: () => 'Apenas a unidade de destino da transferência pode aceitá-la.',
  },
  TRANSFER_NOT_FOUND: {
    title: 'Transferência não encontrada',
    message: () => 'A solicitação foi removida ou está fora do seu escopo.',
  },

  // --- Não encontrado / escopo ---
  CLASS_NOT_FOUND: {
    title: 'Turma não encontrada',
    message: () => 'A turma foi removida ou você não tem acesso a ela.',
  },
  STUDENT_NOT_FOUND: {
    title: 'Aluno não encontrado',
    message: () => 'O cadastro foi desativado ou está fora do seu escopo.',
  },
  TEACHER_NOT_FOUND: {
    title: 'Professor não encontrado',
    message: () => 'O perfil docente foi removido ou está fora do seu escopo.',
  },
  SUBJECT_NOT_FOUND: {
    title: 'Disciplina não encontrada',
    message: () => 'A disciplina foi removida ou está fora do seu escopo.',
  },

  // --- Painel gerencial / relatórios ---
  SCOPE_FORBIDDEN: {
    title: 'Escopo fora do seu alcance',
    message: () => 'Você só pode gerar dados da sua rede, escola ou turma.',
  },
  ANALYTICS_FORBIDDEN: {
    title: 'Painel indisponível para o seu perfil',
    message: () => 'O painel gerencial e os relatórios são da gestão da rede e das escolas.',
  },
  INVALID_FILTER: {
    title: 'Filtro inválido',
    message: (d) => `O parâmetro "${d?.param ?? 'informado'}" não é aceito neste painel.`,
  },
  INVALID_REPORT_PARAMS: {
    title: 'Parâmetros do relatório inválidos',
    message: (d) => `Revise o campo "${d?.field ?? 'destacado'}" e tente de novo.`,
  },
  REPORT_RATE_LIMITED: {
    title: 'Muitos relatórios em processamento',
    message: () => 'Você já tem 5 relatórios na fila. Aguarde a conclusão de um deles.',
  },
  REPORT_EXPIRED: {
    title: 'Relatório expirado',
    message: () => 'O arquivo tem validade de 30 dias. Gere o relatório novamente.',
  },
  EDUCACENSO_VALIDATION_FAILED: {
    title: 'Educacenso: campos obrigatórios ausentes',
    message: (d) =>
      `${(d?.failures as unknown[] | undefined)?.length ?? 'Alguns'} aluno(s) sem dados exigidos pelo INEP.`,
    action: { label: 'Ver falhas', kind: 'view-failures' },
  },
  ACADEMIC_YEAR_NOT_FOUND: {
    title: 'Ano letivo não encontrado',
    message: () => 'Não há ano letivo com esse número na rede.',
  },

  // --- Privacidade / LGPD ---
  STUDENT_HAS_ACTIVE_ENROLLMENT: {
    title: 'Aluno com matrícula ativa',
    message: () => 'Só é possível anonimizar um aluno sem matrícula ativa na rede.',
  },

  // --- Recuperação de senha ---
  INVALID_RESET_TOKEN: {
    title: 'Link inválido',
    message: () => 'Este link de redefinição é inválido ou já foi utilizado. Solicite um novo.',
  },
  EXPIRED_RESET_TOKEN: {
    title: 'Link expirado',
    message: () => 'O link de redefinição vale por 2 horas. Solicite um novo.',
  },
  WEAK_PASSWORD: {
    title: 'Senha fraca',
    message: () => 'A nova senha deve ter ao menos 8 caracteres.',
  },

  // --- Genéricos do envelope ---
  VALIDATION_ERROR: {
    title: 'Dados inválidos',
    message: () => 'Revise os campos destacados e tente novamente.',
  },
  HTTP404: {
    title: 'Recurso não encontrado',
    message: () => 'O item não existe ou foi removido.',
  },
  PERMISSIONDENIED: {
    title: 'Sem permissão',
    message: () => 'Seu papel não permite esta ação.',
  },
  NOTAUTHENTICATED: {
    title: 'Sessão expirada',
    message: () => 'Faça login novamente para continuar.',
  },
  INTERNAL_SERVER_ERROR: {
    title: 'Erro no servidor',
    message: () => 'Ocorreu uma falha inesperada. Tente novamente em instantes.',
  },
}

export const FALLBACK_ERROR: ErrorDef = {
  title: 'Não foi possível concluir',
  message: () => 'Tente novamente. Se persistir, informe o código ao suporte.',
}

/** Resolve um `error.code` (com fallback). */
export function resolveError(code?: string | null): ErrorDef {
  return (code && ERROR_MESSAGES[code]) || FALLBACK_ERROR
}

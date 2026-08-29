import type { BadgeProps } from './Badge'

/**
 * enum do backend → rótulo humano (+ tom/forma de Badge quando aplicável).
 * NUNCA renderize o enum cru na interface. Cobre todos os enums de `core.models`
 * e dos apps de domínio.
 */

export type StatusDef = { label: string; tone: BadgeProps['tone']; shape?: BadgeProps['shape'] }

/* -------- Matrícula (students.EnrollmentStatus) -------- */
export const ENROLLMENT_STATUS: Record<string, StatusDef> = {
  ENROLLED: { label: 'Matriculado', tone: 'brand' },
  APPROVED: { label: 'Aprovado', tone: 'ok' },
  FAILED_ACADEMIC: { label: 'Reprovado · nota', tone: 'danger', shape: 'square' },
  FAILED_ATTENDANCE: { label: 'Reprovado · frequência', tone: 'danger', shape: 'diamond' },
  TRANSFERRED_INTERNAL: { label: 'Transferido na rede', tone: 'neutral' },
  TRANSFERRED_EXTERNAL: { label: 'Transferido para fora', tone: 'neutral' },
  DROPOUT: { label: 'Evasão', tone: 'neutral', shape: 'diamond' },
  DECEASED: { label: 'Óbito', tone: 'neutral', shape: 'square' },
}

/* -------- Transferência (students.TransferRequestStatus) -------- */
export const TRANSFER_STATUS: Record<string, StatusDef> = {
  PENDING_SME: { label: 'Aguardando SME', tone: 'warn' },
  APPROVED_BY_SME: { label: 'Autorizada pela SME', tone: 'brand' },
  ACCEPTED_BY_DESTINATION: { label: 'Aceita pelo destino', tone: 'ok' },
  REJECTED: { label: 'Recusada', tone: 'danger', shape: 'square' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
}

/* -------- Etapa de ensino (governance.EvaluationType / StageType) -------- */
export const EVALUATION_TYPE: Record<string, StatusDef> = {
  NUMERIC: { label: 'Nota numérica', tone: 'brand' },
  CONCEPT: { label: 'Conceito', tone: 'neutral' },
  DESCRIPTIVE: { label: 'Parecer descritivo', tone: 'qual' },
}

export const STAGE_TYPE: Record<string, string> = {
  INFANTIL: 'Educação Infantil',
  FUNDAMENTAL_I: 'Fundamental — Anos Iniciais',
  FUNDAMENTAL_II: 'Fundamental — Anos Finais',
  EJA: 'EJA',
}

/* -------- Ano letivo (governance.AcademicYearStatus) -------- */
export const ACADEMIC_YEAR_STATUS: Record<string, StatusDef> = {
  PLANNED: { label: 'Planejado', tone: 'neutral' },
  ACTIVE: { label: 'Ativo', tone: 'ok' },
  CLOSED: { label: 'Encerrado', tone: 'neutral' },
}

/* -------- Turma (classes.Shift) -------- */
export const SHIFT: Record<string, string> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  FULL_TIME: 'Integral',
  NIGHT: 'Noite',
}

/* -------- Escola (schools.SchoolType) -------- */
export const SCHOOL_TYPE: Record<string, string> = {
  CRECHE: 'Creche',
  PRE_ESCOLA: 'Pré-escola',
  FUNDAMENTAL_1: 'Fundamental I',
  FUNDAMENTAL_2: 'Fundamental II',
  EJA: 'EJA',
  MISTA: 'Mista',
}

/* -------- Documentos (documents.Document.DOCUMENT_TYPES) -------- */
export const DOCUMENT_TYPE: Record<string, string> = {
  rg: 'RG',
  cpf: 'CPF',
  birth_certificate: 'Certidão de nascimento',
  address_proof: 'Comprovante de endereço',
  previous_school: 'Histórico anterior',
  medical_report: 'Relatório médico',
  other: 'Outro',
}

/* -------- Frequência (class_diary.AttendanceStatus) -------- */
export const ATTENDANCE_STATUS: Record<string, StatusDef> = {
  PRESENT: { label: 'Presente', tone: 'ok' },
  ABSENT: { label: 'Ausente', tone: 'danger', shape: 'square' },
  EXCUSED_ABSENCE: { label: 'Falta justificada', tone: 'warn' },
}

/* -------- Histórico escolar (class_diary.SchoolHistory.final_status) -------- */
export const SCHOOL_HISTORY_STATUS: Record<string, StatusDef> = {
  approved: { label: 'Aprovado', tone: 'ok' },
  failed: { label: 'Reprovado', tone: 'danger', shape: 'square' },
  pending: { label: 'Em andamento', tone: 'neutral' },
}

/* -------- Completude do diário (dashboard gerencial) -------- */
export const DIARY_COMPLETENESS_STATUS: Record<string, StatusDef> = {
  CRITICAL: { label: 'Crítico', tone: 'danger', shape: 'square' },
  LATE: { label: 'Em atraso', tone: 'warn' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'brand' },
  CLOSED: { label: 'Fechado', tone: 'ok' },
  QUALITATIVE: { label: 'Pareceres', tone: 'qual' },
  NO_TEACHER: { label: 'Sem regente', tone: 'danger', shape: 'diamond' },
  NO_DATA: { label: 'Sem lançamento', tone: 'neutral' },
}

/* -------- Vínculo aluno–responsável (students.KinshipType) -------- */
export const KINSHIP_TYPE: Record<string, string> = {
  MOTHER: 'Mãe',
  FATHER: 'Pai',
  LEGAL_GUARDIAN: 'Responsável legal',
  GRANDPARENT: 'Avô / Avó',
  OTHER: 'Outro',
}

/* -------- Gênero (students.Student.GENDER_CHOICES) -------- */
export const GENDER: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
  O: 'Outro',
}

/* -------- Raça / cor (students.Student.RACE_COLOR_CHOICES) -------- */
export const RACE_COLOR: Record<string, string> = {
  BRANCA: 'Branca',
  PRETA: 'Preta',
  PARDA: 'Parda',
  AMARELA: 'Amarela',
  INDIGENA: 'Indígena',
  NAO_DECLARADA: 'Não declarada',
}

/* -------- Papéis (core.UserRole) -------- */
export const USER_ROLE: Record<string, string> = {
  sme_admin: 'Administrador da SME',
  sme_supervisor: 'Supervisor Pedagógico da SME',
  school_director: 'Diretor / Gestor Escolar',
  school_secretary: 'Secretário Escolar',
  teacher: 'Professor',
  student_guardian: 'Aluno / Responsável',
}

/** Helper: rótulo com fallback para o próprio código. */
export function labelOf(
  map: Record<string, string | StatusDef>,
  key: string | null | undefined
): string {
  if (!key) {
    return '—'
  }
  const v = map[key]
  if (!v) {
    return key
  }
  return typeof v === 'string' ? v : v.label
}

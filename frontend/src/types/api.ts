/**
 * Tipos e interfaces da API — domínio SME (Gestão Municipal)
 */

// ============ AUTH ============

export type UserRole =
  | 'sme_admin'
  | 'sme_supervisor'
  | 'school_director'
  | 'school_secretary'
  | 'teacher'
  | 'student_guardian'

export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  cpf: string
  avatar?: string
  bio?: string
  role: UserRole
  school: string | null
  education_department: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface LoginRequest {
  identifier: string
  password: string
}

export interface LoginResponse {
  requires_2fa: boolean
  /** presente quando requires_2fa = true */
  challenge_token?: string
  /** presentes quando requires_2fa = false */
  access?: string
  refresh?: string
  user?: User
}

// ============ 2FA / TOTP ============

export interface TOTPStatus {
  enabled: boolean
  confirmed_at: string | null
  backup_codes_remaining: number
}

export interface TOTPEnableResponse {
  secret: string
  qr_code: string
  device_id: string
}

export interface TOTPConfirmResponse {
  backup_codes: string[]
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
  role?: UserRole
  school?: string
  education_department?: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
  new_password_confirm: string
}

// ============ SME / EDUCATION DEPARTMENT ============

export interface EducationDepartment {
  id: string
  municipality_name: string
  ibge_code: string
  secretary_name?: string
  min_passing_grade?: number
  min_attendance_percentage?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AcademicYearStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED'

export interface AcademicYear {
  id: string
  education_department: string
  education_department_name?: string
  year: number
  status: AcademicYearStatus
  start_date: string
  end_date: string
  periods_count?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AcademicPeriod {
  id: string
  academic_year: string
  academic_year_label?: number
  name: string
  period_number: number
  start_date: string
  end_date: string
  grade_deadline: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type StageType = 'INFANTIL' | 'FUNDAMENTAL_I' | 'FUNDAMENTAL_II' | 'EJA'
export type EvaluationType = 'NUMERIC' | 'CONCEPT' | 'DESCRIPTIVE'

export interface EducationStage {
  id: string
  name: string
  code: string
  stage_type: StageType
  evaluation_type: EvaluationType
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CurriculumMatrixItem {
  id: string
  curriculum_matrix: string
  subject: string
  subject_name?: string
  weekly_hours: number
  annual_hours: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CurriculumMatrix {
  id: string
  education_department: string
  education_stage: string
  education_stage_name?: string
  name: string
  items?: CurriculumMatrixItem[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TransferStatus =
  | 'PENDING_SME'
  | 'APPROVED_BY_SME'
  | 'ACCEPTED_BY_DESTINATION'
  | 'REJECTED'
  | 'CANCELLED'

export interface TransferRequest {
  id: string
  student: string
  student_name?: string
  origin_school: string
  origin_school_name?: string
  destination_school?: string | null
  destination_school_name?: string | null
  academic_year: string
  reason: string
  status: TransferStatus
  requested_at: string
  resolved_at?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTransferRequestPayload {
  student: string
  origin_school: string
  destination_school?: string | null
  academic_year: string
  reason: string
}

// ============ SCHOOLS ============

export type SchoolType =
  | 'CRECHE'
  | 'PRE_ESCOLA'
  | 'FUNDAMENTAL_1'
  | 'FUNDAMENTAL_2'
  | 'EJA'
  | 'MISTA'

export interface School {
  id: string
  education_department: string
  education_department_name?: string
  inep_code?: string | null
  name: string
  cnpj?: string | null
  school_type: SchoolType
  director_user?: string | null
  director_name?: string
  email?: string
  phone?: string
  website?: string
  address_street?: string
  address_number?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  address_zip_code?: string
  max_students_per_class?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSchoolRequest {
  education_department: string
  name: string
  school_type: SchoolType
  inep_code?: string
  cnpj?: string
  director_user?: string
  email?: string
  phone?: string
  website?: string
  address_street?: string
  address_number?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  address_zip_code?: string
  max_students_per_class?: number
}

// ============ STUDENTS ============

export interface Student {
  id: string
  education_department: string
  user?: string | null
  user_name?: string | null
  user_email?: string | null
  unique_municipal_id: string
  registration_number?: string
  inep_id?: string | null
  full_name: string
  social_name?: string
  cpf: string
  birth_certificate?: string
  nis_code?: string
  birth_date: string
  gender?: string
  race_color?: string
  mother_name: string
  father_name?: string
  has_special_needs?: boolean
  special_needs_details?: string
  notes?: string
  age?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateStudentRequest {
  education_department: string
  unique_municipal_id: string
  full_name: string
  mother_name: string
  birth_date: string
  cpf: string
  social_name?: string
  inep_id?: string
  gender?: string
  race_color?: string
  father_name?: string
  has_special_needs?: boolean
  special_needs_details?: string
  user?: string
}

// ============ GUARDIANS ============

export type KinshipType =
  | 'MOTHER'
  | 'FATHER'
  | 'LEGAL_GUARDIAN'
  | 'GRANDPARENT'
  | 'OTHER'

export const KINSHIP_TYPE_LABELS: Record<KinshipType, string> = {
  MOTHER: 'Mãe',
  FATHER: 'Pai',
  LEGAL_GUARDIAN: 'Responsável legal',
  GRANDPARENT: 'Avô / Avó',
  OTHER: 'Outro',
}

export interface Guardian {
  id: string
  user?: string | null
  user_name?: string | null
  user_email?: string | null
  full_name: string
  cpf: string
  phone: string
  email?: string
  address?: string
  occupation?: string
  students_count?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface StudentGuardianLink {
  id: string
  student: string
  student_name?: string
  guardian: string
  guardian_name?: string
  kinship_type: KinshipType
  is_emergency_contact: boolean
}

// ============ TEACHERS ============

export interface TeacherProfile {
  id: string
  user: string
  user_name?: string
  user_email?: string
  education_department: string
  registration_number: string
  cpf: string
  formation_area?: string
  birth_date?: string
  hiring_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Alias legado */
export type Teacher = TeacherProfile

export interface TeacherAllocation {
  id: string
  teacher_profile: string
  teacher_name?: string
  school_class: string
  school_class_name?: string
  subject?: string | null
  subject_name?: string | null
  is_regent: boolean
  created_at: string
}

// ============ SUBJECTS ============

export interface Subject {
  id: string
  education_department: string
  name: string
  bncc_code?: string
  area_of_knowledge: string
  description?: string
  minimum_passing_grade?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSubjectRequest {
  education_department: string
  name: string
  area_of_knowledge: string
  bncc_code?: string
  description?: string
  minimum_passing_grade?: number
}

// ============ CLASSES (SchoolClass) ============

export type Shift = 'MORNING' | 'AFTERNOON' | 'FULL_TIME' | 'NIGHT'

export interface SchoolClass {
  id: string
  school: string
  school_name?: string
  academic_year: string
  academic_year_label?: number | string
  curriculum_matrix: string
  curriculum_matrix_name?: string
  name: string
  shift: Shift
  max_capacity?: number
  room_number?: string
  inep_class_code?: string
  classroom?: string | null
  classroom_number?: string | null
  student_count?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Alias legado usado em páginas existentes */
export type Class = SchoolClass

export interface CreateClassRequest {
  school: string
  academic_year: string
  curriculum_matrix: string
  name: string
  shift: Shift
  max_capacity?: number
  room_number?: string
}

// ============ ENROLLMENTS ============

export type EnrollmentStatus =
  | 'ENROLLED'
  | 'APPROVED'
  | 'FAILED_ACADEMIC'
  | 'FAILED_ATTENDANCE'
  | 'TRANSFERRED_INTERNAL'
  | 'TRANSFERRED_EXTERNAL'
  | 'DROPOUT'
  | 'DECEASED'

export interface Enrollment {
  id: string
  student: string
  student_name?: string
  school_class: string
  school_class_name?: string
  school?: string
  enrollment_number: string
  enrollment_date: string
  status: EnrollmentStatus
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateEnrollmentRequest {
  student: string
  school_class: string
  enrollment_number?: string
}

// ============ GRADES ============

export interface Grade {
  id: string
  enrollment: string
  student_name?: string
  subject: string
  subject_name?: string
  academic_period: string
  academic_period_name?: string
  teacher: string
  teacher_name?: string
  score: number
  recovery_score?: number | null
  final_score?: number | null
  effective_score?: number
  assessment_type?: string
  notes?: string
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface CreateGradeRequest {
  enrollment: string
  subject: string
  academic_period: string
  teacher?: string
  score: number
  recovery_score?: number
  final_score?: number
  assessment_type?: string
  notes?: string
}

// ============ ATTENDANCE ============

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED_ABSENCE'

export interface Attendance {
  id: string
  enrollment: string
  student_name?: string
  school_class: string
  school_class_name?: string
  subject?: string | null
  subject_name?: string | null
  date: string
  status: AttendanceStatus
  justification_note?: string
  observation?: string
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface CreateAttendanceRequest {
  enrollment: string
  school_class: string
  date: string
  status: AttendanceStatus
  subject?: string | null
  justification_note?: string
}

// ============ EVALUATIONS ============

export interface DescriptiveEvaluation {
  id: string
  enrollment: string
  student_name?: string
  academic_period: string
  academic_period_name?: string
  teacher: string
  teacher_name?: string
  development_report: string
  learning_milestones?: Record<string, boolean> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateDescriptiveEvaluationRequest {
  enrollment: string
  academic_period: string
  teacher?: string
  development_report: string
  learning_milestones?: Record<string, boolean>
}

// ============ DOCUMENTS ============

export type DocumentType =
  | 'rg'
  | 'cpf'
  | 'birth_certificate'
  | 'address_proof'
  | 'previous_school'
  | 'other'

export interface Document {
  id: string
  student: string
  student_name?: string
  document_type: DocumentType | string
  file: string
  file_name: string
  description?: string
  expiration_date?: string
  uploaded_by?: string
  uploaded_by_name?: string
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface UploadDocumentRequest {
  student: string
  document_type: DocumentType | string
  file: File
  description?: string
}

// ============ MESSAGES ============

export interface Message {
  id: string
  sender?: string
  sender_name?: string
  recipient: string
  recipient_name?: string
  subject: string
  body: string
  read: boolean
  read_at?: string
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface CreateMessageRequest {
  recipient: string
  subject: string
  body: string
}

// ============ NOTIFICATIONS ============

export type NotificationType = 'email' | 'whatsapp' | 'in_app'

export interface Notification {
  id: string
  user: string
  title: string
  message: string
  notification_type: string
  link?: string
  read: boolean
  read_at?: string
  created_at: string
  updated_at: string
}

// ============ PAGINATION ============

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface PaginationParams {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
}

// ============ API RESPONSES ============

export interface ApiResponse<T> {
  data?: T
  message?: string
  errors?: Record<string, string[]>
  status: 'success' | 'error'
}

export interface ApiErrorResponse {
  status: 'error'
  message: string
  errors?: Record<string, unknown>
}

// ============ HEALTH CHECK ============

export interface HealthResponse {
  status: 'healthy'
  message: string
}

export interface ReadyResponse {
  status: 'ready' | 'not_ready'
  message: string
  checks: {
    database: boolean
    redis: boolean
    cache: boolean
  }
}

// ============ LABELS HELPERS ============

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  CRECHE: 'Creche',
  PRE_ESCOLA: 'Pré-escola',
  FUNDAMENTAL_1: 'Fundamental I',
  FUNDAMENTAL_2: 'Fundamental II',
  EJA: 'EJA',
  MISTA: 'Mista',
}

export const SHIFT_LABELS: Record<Shift, string> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  FULL_TIME: 'Integral',
  NIGHT: 'Noite',
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Presente',
  ABSENT: 'Ausente',
  EXCUSED_ABSENCE: 'Falta justificada',
}

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING_SME: 'Pendente SME',
  APPROVED_BY_SME: 'Aprovada pela SME',
  ACCEPTED_BY_DESTINATION: 'Aceita pelo destino',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
}

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ENROLLED: 'Matriculado',
  APPROVED: 'Aprovado',
  FAILED_ACADEMIC: 'Reprovado por nota',
  FAILED_ATTENDANCE: 'Reprovado por frequência',
  TRANSFERRED_INTERNAL: 'Transferido (interno)',
  TRANSFERRED_EXTERNAL: 'Transferido (externo)',
  DROPOUT: 'Desistente',
  DECEASED: 'Falecido',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  sme_admin: 'Administrador SME',
  sme_supervisor: 'Supervisor SME',
  school_director: 'Diretor Escolar',
  school_secretary: 'Secretário Escolar',
  teacher: 'Professor',
  student_guardian: 'Aluno / Responsável',
}

// ============ ADMISSÕES (matrícula / rematrícula) ============

export type AdmissionCycleStatus =
  | 'DRAFT'
  | 'RENEWAL_OPEN'
  | 'RENEWAL_CLOSED'
  | 'NEW_OPEN'
  | 'NEW_CLOSED'
  | 'PROCESSED'

export interface AdmissionCycle {
  id: string
  education_department: string
  target_academic_year: string
  target_year: number
  name: string
  renewal_opens_at: string
  renewal_closes_at: string
  new_request_opens_at: string
  new_request_closes_at: string
  status: AdmissionCycleStatus
  next_status: AdmissionCycleStatus | null
  renewal_open: boolean
  new_request_open: boolean
  created_at?: string
  updated_at?: string
}

export type RenewalOutcome = 'PENDING' | 'STAY' | 'INTERNAL_TRANSFER' | 'NOT_RETURNING'

export interface RenewalRequest {
  id: string
  cycle: string
  student: string
  student_name: string
  target_year: number
  current_school: string
  current_class: string
  outcome: RenewalOutcome
  contact_phone: string
  residential_address: string
  residential_lat: string | null
  residential_lng: string | null
  has_new_special_needs: boolean
  special_needs_note: string
  confirmed_at: string | null
  renewal_open: boolean
  next_enrollment_id: string | null
  created_at?: string
}

export type EnrollmentRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AWAITING_PROCESSING'
  | 'CANCELLED'

export type EvidenceKind = 'PCD' | 'SIBLING' | 'SOCIAL_VULNERABILITY'
export type EvidenceStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface SchoolPreference {
  id: string
  rank: number
  school: string
  school_name: string
}

export interface PriorityEvidence {
  id: string
  request: string
  request_applicant?: string
  kind: EvidenceKind
  declared_school: string | null
  file: string
  file_name: string
  status: EvidenceStatus
  verified_by: string | null
  verified_at: string | null
  review_note: string
  created_at?: string
}

export interface EnrollmentRequest {
  id: string
  cycle: string
  target_year: number
  guardian: string
  origin: 'NEW' | 'RENEWAL_TRANSFER'
  renewal_request: string | null
  student: string | null
  applicant_display: string
  applicant_name: string
  applicant_cpf: string | null
  applicant_birth_date: string | null
  applicant_mother_name: string
  desired_shift: string
  target_grade_label: string
  residential_address: string
  residential_lat: string | null
  residential_lng: string | null
  status: EnrollmentRequestStatus
  submitted_at: string | null
  score_total: number | null
  score_breakdown: Record<string, unknown> | null
  preferences: SchoolPreference[]
  evidences: PriorityEvidence[]
  created_at?: string
}

export const RENEWAL_OUTCOME_LABELS: Record<RenewalOutcome, string> = {
  PENDING: 'Pendente',
  STAY: 'Permanece',
  INTERNAL_TRANSFER: 'Transferência interna',
  NOT_RETURNING: 'Não retorna',
}

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  PCD: 'Pessoa com Deficiência',
  SIBLING: 'Irmão na unidade',
  SOCIAL_VULNERABILITY: 'Vulnerabilidade social',
}

export const ADMISSION_CYCLE_STATUS_LABELS: Record<AdmissionCycleStatus, string> = {
  DRAFT: 'Rascunho',
  RENEWAL_OPEN: 'Rematrícula aberta',
  RENEWAL_CLOSED: 'Rematrícula encerrada',
  NEW_OPEN: 'Novas matrículas abertas',
  NEW_CLOSED: 'Novas matrículas encerradas',
  PROCESSED: 'Alocação processada',
}

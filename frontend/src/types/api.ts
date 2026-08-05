/**
 * Tipos e interfaces da API do Sistema de Gestão Escolar
 */

// ============ AUTH ============

export type UserRole = 'admin' | 'director' | 'coordinator' | 'secretary' | 'teacher' | 'guardian' | 'student'

export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  document?: string
  avatar?: string
  bio?: string
  role: UserRole
  school?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
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
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
  new_password_confirm: string
}

// ============ SCHOOLS ============

export interface School {
  id: string
  name: string
  cnpj: string
  email: string
  phone?: string
  website?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSchoolRequest {
  name: string
  cnpj: string
  email: string
  phone?: string
  website?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
}

// ============ STUDENTS ============

export interface Student {
  id: string
  user?: User
  user_name?: string
  user_email?: string
  school?: School
  registration_number?: string
  birth_date?: string
  gender?: 'M' | 'F'
  nationality?: string
  status?: 'active' | 'inactive'
  cpf?: string
  rg?: string
  age?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateStudentRequest {
  username: string
  email: string
  first_name: string
  last_name: string
  birth_date: string
  gender?: 'M' | 'F'
  nationality?: string
  school: string
}

// ============ GUARDIANS ============

export interface Guardian {
  id: string
  user: User
  school: School
  relationship: 'parent' | 'guardian' | 'other'
  occupation?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateGuardianRequest {
  username: string
  email: string
  first_name: string
  last_name: string
  relationship: 'parent' | 'guardian' | 'other'
  occupation?: string
  school: string
}

// ============ TEACHERS ============

export interface Teacher {
  id: string
  user: User
  school: School
  registration_number: string
  subjects: Subject[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTeacherRequest {
  username: string
  email: string
  first_name: string
  last_name: string
  registration_number: string
  school: string
  subjects?: string[]
}

// ============ SUBJECTS ============

export interface Subject {
  id: string
  school: School
  name: string
  code: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSubjectRequest {
  name: string
  code: string
  description?: string
  school: string
}

// ============ CLASSES ============

export type ClassStatus = 'active' | 'inactive' | 'archived'

export interface Class {
  id: string
  school?: School
  name?: string
  code?: string
  year?: number
  semester?: number
  grade_level?: string
  status?: ClassStatus
  teacher?: Teacher
  teacher_name?: string
  students?: Student[]
  student_count?: number
  subjects?: Subject[]
  classroom?: string
  classroom_number?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateClassRequest {
  name: string
  code: string
  year: number
  semester: number
  school: string
  teacher?: string
  subjects?: string[]
}

// ============ ENROLLMENTS ============

export type EnrollmentStatus = 'active' | 'inactive' | 'transferred' | 'dropped'

export interface Enrollment {
  id: string
  school: School
  student: Student
  class: Class
  enrollment_date: string
  status: EnrollmentStatus
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateEnrollmentRequest {
  student: string
  class: string
  school: string
  enrollment_date?: string
}

// ============ GRADES ============

export interface Grade {
  id: string
  student?: Student
  student_name?: string
  subject?: Subject
  subject_name?: string
  class?: Class
  class_name?: string
  first_period?: number
  second_period?: number
  third_period?: number
  fourth_period?: number
  participation?: number
  behavior?: number
  average?: number
  final_exam?: number
  final_grade?: number
  notes?: string
  status?: 'approved' | 'failed' | 'pending'
  created_at: string
  updated_at: string
}

export interface CreateGradeRequest {
  student: string
  subject: string
  class: string
  first_period?: number
  second_period?: number
  third_period?: number
  fourth_period?: number
  final_exam?: number
}

// ============ ATTENDANCE ============

export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'excused'

export interface Attendance {
  id: string
  student?: Student
  student_name?: string
  class?: Class
  class_name?: string
  subject?: Subject
  subject_name?: string
  date: string
  status: AttendanceStatus
  observation?: string
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface CreateAttendanceRequest {
  student: string
  class: string
  date: string
  status: AttendanceStatus
  observation?: string
}

// ============ DOCUMENTS ============

export type DocumentType = 'rg' | 'cpf' | 'birth_certificate' | 'address_proof' | 'previous_school' | 'other'

export interface Document {
  id: string
  student: Student
  document_type: DocumentType
  file: string
  file_name: string
  file_size: number
  uploaded_at: string
  created_at: string
  updated_at: string
}

export interface UploadDocumentRequest {
  student: string
  document_type: DocumentType
  file: File
}

// ============ MESSAGES ============

export interface Message {
  id: string
  sender: User
  recipient: User
  subject: string
  body: string
  read: boolean
  read_at?: string
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
  user: User
  title: string
  message: string
  type: NotificationType
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

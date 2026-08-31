import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api-helpers'
import { normalizeCPF } from '@/utils/validation'
import type {
  EducationDepartment,
  PaginatedResponse,
  SchoolClass,
  Subject,
  TeacherAllocation,
  TeacherProfile,
} from '@/types/api'

// --- Perfis docentes -------------------------------------------------------

export function fetchTeachers() {
  return apiGet<PaginatedResponse<TeacherProfile>>('teachers/')
}

export function fetchTeacher(id: string) {
  return apiGet<TeacherProfile>(`teachers/${id}/`)
}

type TeacherUserPayload = {
  cpf: string
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  education_department: string
}

type CreatedUser = {
  id: string
}

/** Cria o usuário (role=teacher) que dará suporte ao perfil docente. */
export function createTeacherUser(payload: TeacherUserPayload) {
  return apiPost<CreatedUser>('accounts/users/create_user/', {
    ...payload,
    cpf: normalizeCPF(payload.cpf),
    role: 'teacher',
  })
}

type TeacherProfilePayload = {
  user: string
  education_department: string
  registration_number: string
  cpf: string
  formation_area?: string
  birth_date?: string | null
  hiring_date?: string | null
}

export function createTeacherProfile(payload: TeacherProfilePayload) {
  return apiPost<TeacherProfile>('teachers/', payload)
}

export function updateTeacherProfile(id: string, payload: Partial<TeacherProfilePayload>) {
  return apiPut<TeacherProfile>(`teachers/${id}/`, payload)
}

export function deleteTeacher(id: string) {
  return apiDelete(`teachers/${id}/`)
}

// --- Alocações -----------------------------------------------------------

export function fetchTeacherAllocations() {
  return apiGet<PaginatedResponse<TeacherAllocation>>('teachers/allocations/')
}

type AllocationPayload = {
  teacher_profile: string
  school_class: string
  subject?: string | null
  is_regent: boolean
}

export function createTeacherAllocation(payload: AllocationPayload) {
  return apiPost<TeacherAllocation>('teachers/allocations/', payload)
}

export function deleteTeacherAllocation(id: string) {
  return apiDelete(`teachers/allocations/${id}/`)
}

// --- Dados auxiliares para os formulários --------------------------------

export function fetchEducationDepartments() {
  return apiGet<PaginatedResponse<EducationDepartment>>('sme/departments/')
}

export function fetchSchoolClasses() {
  return apiGet<PaginatedResponse<SchoolClass>>('classes/')
}

export function fetchSubjects() {
  return apiGet<PaginatedResponse<Subject>>('subjects/')
}

import { apiClient } from '@/services/api'
import { apiGet } from '@/utils/api-helpers'
import type {
  Guardian,
  PaginatedResponse,
  StudentGuardianLink,
} from '@/types/api'

export type GuardianListParams = {
  search?: string
  is_active?: boolean
  page_size?: number
}

export function fetchGuardians(params: GuardianListParams = {}) {
  return apiGet<PaginatedResponse<Guardian>>('guardians/', {
    page_size: 200,
    ...params,
  })
}

export function fetchGuardian(id: string) {
  return apiGet<Guardian>(`guardians/${id}/`)
}

export function fetchGuardianLinks(guardianId: string) {
  return apiGet<PaginatedResponse<StudentGuardianLink>>('guardians/links/', {
    guardian: guardianId,
    page_size: 200,
  })
}

export type GuardianPayload = Pick<
  Guardian,
  'full_name' | 'cpf' | 'phone' | 'email' | 'address' | 'occupation'
>

export async function createGuardian(payload: GuardianPayload) {
  const { data } = await apiClient.post<Guardian>('guardians/', payload)
  return data
}

export async function updateGuardian(id: string, payload: GuardianPayload) {
  const { data } = await apiClient.put<Guardian>(`guardians/${id}/`, payload)
  return data
}

export async function deactivateGuardian(id: string) {
  await apiClient.delete(`guardians/${id}/`)
}

export type StudentLinkPayload = {
  student: string
  guardian: string
  kinship_type: string
  is_emergency_contact: boolean
}

export async function createStudentLink(payload: StudentLinkPayload) {
  const { data } = await apiClient.post<StudentGuardianLink>('guardians/links/', payload)
  return data
}

export async function deleteStudentLink(id: string) {
  await apiClient.delete(`guardians/links/${id}/`)
}

// ---------------------------------------------------------------- Vinculação V2
// (DX-SGE-006) — prova de parentesco: aprovação da escola OU código de uso único.

/** Responsável verifica apenas se existe um estudante com o CPF (sem dados). */
export async function findStudentByCpf(cpf: string) {
  return apiGet<{ found: boolean }>('students/find-by-cpf/', { cpf })
}

export type LinkRequestPayload = {
  student_cpf: string
  birth_date: string
  mother_name: string
  kinship_type: string
  is_emergency_contact?: boolean
}

/** Caminho A — responsável solicita o vínculo com 3 fatos do estudante. */
export async function requestStudentLink(payload: LinkRequestPayload) {
  const { data } = await apiClient.post<StudentGuardianLink>(
    'guardians/link-requests/request/',
    payload
  )
  return data
}

/** Caminho B — responsável resgata o código fornecido pela escola. */
export async function redeemLinkCode(payload: { student_cpf: string; code: string }) {
  const { data } = await apiClient.post<StudentGuardianLink>(
    'guardians/link-by-code/',
    payload
  )
  return data
}

export function fetchLinkRequests(params: { status?: string } = {}) {
  return apiGet<PaginatedResponse<StudentGuardianLink>>('guardians/link-requests/', {
    page_size: 200,
    ...params,
  })
}

/** Equipe aprova/recusa uma solicitação (recusa exige `note`). */
export async function reviewLinkRequest(
  id: string,
  payload: { decision: 'approve' | 'reject'; note?: string }
) {
  const { data } = await apiClient.post<StudentGuardianLink>(
    `guardians/link-requests/${id}/review/`,
    payload
  )
  return data
}

export type LinkCode = {
  id: string
  created_at: string
  expires_at: string
  used: boolean
  used_at: string | null
}

export function fetchLinkCodes(studentId: string) {
  return apiGet<LinkCode[]>(`students/${studentId}/link-codes/`)
}

/** Equipe gera um código de vinculação (exibido apenas nesta resposta). */
export async function generateLinkCode(
  studentId: string,
  payload: { kinship_hint?: string; ttl_hours?: number } = {}
) {
  const { data } = await apiClient.post<{ code: string; expires_at: string }>(
    `students/${studentId}/link-codes/`,
    payload
  )
  return data
}

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

import { apiGet } from '@/utils/api-helpers'
import type { EducationDepartment, PaginatedResponse } from '@/types/api'

/** Lista as secretarias municipais visíveis ao usuário. */
export function fetchEducationDepartments() {
  return apiGet<PaginatedResponse<EducationDepartment>>('sme/departments/')
}

/** Busca uma secretaria municipal específica. */
export function fetchEducationDepartment(id: string) {
  return apiGet<EducationDepartment>(`sme/departments/${id}/`)
}

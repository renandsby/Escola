import { apiGet } from '@/utils/api-helpers'
import type { AcademicYear, PaginatedResponse } from '@/types/api'

/** Lista os anos letivos visíveis ao usuário (escopo por secretaria). */
export function fetchAcademicYears() {
  return apiGet<PaginatedResponse<AcademicYear>>('sme/academic-years/')
}

/** Busca um ano letivo específico. */
export function fetchAcademicYear(id: string) {
  return apiGet<AcademicYear>(`sme/academic-years/${id}/`)
}

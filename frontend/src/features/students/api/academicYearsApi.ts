import { apiGet } from '@/utils/api-helpers'
import type { AcademicYear, PaginatedResponse } from '@/types/api'

/**
 * Busca a listagem de anos letivos.
 */
export function fetchAcademicYears() {
  return apiGet<PaginatedResponse<AcademicYear>>('sme/academic-years/')
}

import { apiGet } from '@/utils/api-helpers'
import type { AcademicPeriod, PaginatedResponse } from '@/types/api'

/** Lista os períodos avaliativos, opcionalmente filtrados por ano letivo. */
export function fetchAcademicPeriods(academicYearId?: string) {
  const query = academicYearId ? `?academic_year=${academicYearId}` : ''
  return apiGet<PaginatedResponse<AcademicPeriod>>(`sme/academic-periods/${query}`)
}

/** Busca um período avaliativo específico. */
export function fetchAcademicPeriod(id: string) {
  return apiGet<AcademicPeriod>(`sme/academic-periods/${id}/`)
}

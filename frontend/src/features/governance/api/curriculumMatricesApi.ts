import { apiGet } from '@/utils/api-helpers'
import type { CurriculumMatrix, PaginatedResponse } from '@/types/api'

/** Lista as matrizes curriculares da rede municipal. */
export function fetchCurriculumMatrices() {
  return apiGet<PaginatedResponse<CurriculumMatrix>>('sme/curriculum-matrices/')
}

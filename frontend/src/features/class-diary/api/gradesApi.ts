import { apiGet } from '@/utils/api-helpers'
import type { Grade, PaginatedResponse } from '@/types/api'
import type { RequestParams } from '@/types'

/**
 * Busca notas já lançadas, usada para pré-preencher o formulário de
 * lançamento em lote.
 */
export function fetchGrades(params?: RequestParams) {
  return apiGet<PaginatedResponse<Grade>>('grades/', params)
}

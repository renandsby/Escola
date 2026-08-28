import { apiGet } from '@/utils/api-helpers'
import type { Enrollment, PaginatedResponse } from '@/types/api'
import type { RequestParams } from '@/types'

/**
 * Busca a listagem de matrículas, opcionalmente filtrada (turma, status etc).
 * Usada tanto para o roster de lançamento em lote quanto para selects gerais.
 */
export function fetchEnrollments(params?: RequestParams) {
  return apiGet<PaginatedResponse<Enrollment>>('enrollments/', params)
}

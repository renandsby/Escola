import { apiGet } from '@/utils/api-helpers'
import type { Attendance, PaginatedResponse } from '@/types/api'
import type { RequestParams } from '@/types'

/**
 * Busca registros de frequência já lançados, usada para pré-preencher o
 * formulário de lançamento em lote.
 */
export function fetchAttendance(params?: RequestParams) {
  return apiGet<PaginatedResponse<Attendance>>('attendance/', params)
}

import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse, Student } from '@/types/api'

/**
 * Busca a listagem de alunos.
 */
export function fetchStudents() {
  return apiGet<PaginatedResponse<Student>>('students/')
}

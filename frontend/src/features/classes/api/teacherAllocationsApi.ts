import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse, TeacherAllocation } from '@/types/api'

/** Lista as alocações docentes visíveis ao usuário. */
export function fetchTeacherAllocations() {
  return apiGet<PaginatedResponse<TeacherAllocation>>('teachers/allocations/')
}

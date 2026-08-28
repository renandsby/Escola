import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse, Subject } from '@/types/api'

export function fetchSubjects() {
  return apiGet<PaginatedResponse<Subject>>('subjects/')
}

export function fetchSubject(id: string) {
  return apiGet<Subject>(`subjects/${id}/`)
}

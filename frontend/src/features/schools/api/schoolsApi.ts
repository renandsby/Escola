import { apiGet } from '@/utils/api-helpers'
import type {
  EducationDepartment,
  PaginatedResponse,
  School,
  User,
} from '@/types/api'

export function fetchSchool(id: string) {
  return apiGet<School>(`schools/${id}/`)
}

export function fetchEducationDepartments() {
  return apiGet<PaginatedResponse<EducationDepartment>>('sme/departments/')
}

export function fetchSchoolDirectors() {
  return apiGet<PaginatedResponse<User>>('accounts/users/', { role: 'school_director' })
}

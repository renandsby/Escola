import { apiGet } from '@/utils/api-helpers'
import type {
  Enrollment,
  Grade,
  PaginatedResponse,
  SchoolClass,
  Student,
} from '@/types/api'

export function fetchStudents() {
  return apiGet<PaginatedResponse<Student>>('students/')
}

export function fetchSchoolClasses() {
  return apiGet<PaginatedResponse<SchoolClass>>('classes/')
}

export function fetchGrades() {
  return apiGet<PaginatedResponse<Grade>>('grades/')
}

export function fetchEnrollments(classId?: string) {
  return apiGet<PaginatedResponse<Enrollment>>('enrollments/', {
    ...(classId ? { school_class: classId } : {}),
  })
}

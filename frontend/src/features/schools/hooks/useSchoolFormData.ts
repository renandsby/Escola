import { useQuery } from '@tanstack/react-query'
import { fetchEducationDepartments, fetchSchool, fetchSchoolDirectors } from '../api/schoolsApi'

export function useEducationDepartmentsQuery() {
  return useQuery({
    queryKey: ['education-departments'],
    queryFn: fetchEducationDepartments,
  })
}

export function useSchoolDirectorsQuery() {
  return useQuery({
    queryKey: ['schools', 'directors'],
    queryFn: fetchSchoolDirectors,
  })
}

export function useSchoolQuery(id?: string) {
  return useQuery({
    queryKey: ['schools', 'detail', id],
    queryFn: () => fetchSchool(id as string),
    enabled: !!id,
  })
}

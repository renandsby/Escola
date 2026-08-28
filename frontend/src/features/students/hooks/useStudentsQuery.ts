import { useQuery } from '@tanstack/react-query'
import { fetchStudents } from '../api/studentsApi'

/**
 * Lista os alunos cadastrados, para uso em selects/dropdowns.
 */
export function useStudentsQuery() {
  return useQuery({
    queryKey: ['students', 'list'],
    queryFn: fetchStudents,
  })
}

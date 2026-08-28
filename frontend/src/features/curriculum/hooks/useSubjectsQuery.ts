import { useQuery } from '@tanstack/react-query'
import { fetchSubjects } from '../api/subjectsApi'

export function useSubjectsQuery() {
  return useQuery({
    queryKey: ['curriculum', 'subjects'],
    queryFn: fetchSubjects,
  })
}

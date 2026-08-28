import { useQuery } from '@tanstack/react-query'
import { fetchTeacherAllocations } from '../api/teacherAllocationsApi'

export function useTeacherAllocationsQuery() {
  return useQuery({
    queryKey: ['classes', 'teacher-allocations'],
    queryFn: fetchTeacherAllocations,
  })
}

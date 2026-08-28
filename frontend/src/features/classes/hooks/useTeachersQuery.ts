import { useQuery } from '@tanstack/react-query'
import { fetchTeacher, fetchTeachers } from '../api/teachersApi'

export function useTeachersQuery() {
  return useQuery({
    queryKey: ['classes', 'teachers'],
    queryFn: fetchTeachers,
  })
}

export function useTeacherQuery(id?: string) {
  return useQuery({
    queryKey: ['classes', 'teacher', id],
    queryFn: () => fetchTeacher(id as string),
    enabled: !!id,
  })
}

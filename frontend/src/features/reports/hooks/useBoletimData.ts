import { useQuery } from '@tanstack/react-query'
import {
  fetchEnrollments,
  fetchGrades,
  fetchSchoolClasses,
  fetchStudents,
} from '../api/boletimApi'

export function useBoletimData(classId: string) {
  const students = useQuery({ queryKey: ['reports', 'students'], queryFn: fetchStudents })
  const classes = useQuery({ queryKey: ['reports', 'classes'], queryFn: fetchSchoolClasses })
  const grades = useQuery({ queryKey: ['reports', 'grades'], queryFn: fetchGrades })
  const enrollments = useQuery({
    queryKey: ['reports', 'enrollments', classId],
    queryFn: () => fetchEnrollments(classId || undefined),
  })

  return { students, classes, grades, enrollments }
}

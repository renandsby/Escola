import { useQuery } from '@tanstack/react-query'
import {
  fetchEducationDepartments,
  fetchSchoolClasses,
  fetchSubjects,
  fetchTeachers,
} from '../api/teachersApi'

export function useEducationDepartmentsQuery() {
  return useQuery({
    queryKey: ['education-departments'],
    queryFn: fetchEducationDepartments,
  })
}

/** Dados auxiliares para o formulário de alocação (professores, turmas, disciplinas). */
export function useAllocationOptions() {
  const teachers = useQuery({ queryKey: ['classes', 'teachers'], queryFn: fetchTeachers })
  const schoolClasses = useQuery({
    queryKey: ['classes', 'school-classes'],
    queryFn: fetchSchoolClasses,
  })
  const subjects = useQuery({ queryKey: ['curriculum', 'subjects'], queryFn: fetchSubjects })
  return { teachers, schoolClasses, subjects }
}

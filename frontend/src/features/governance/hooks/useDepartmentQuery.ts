import { useQuery } from '@tanstack/react-query'
import type { EducationDepartment } from '@/types/api'
import { fetchEducationDepartment, fetchEducationDepartments } from '../api/departmentsApi'

/**
 * Resolve a secretaria municipal do usuário logado: busca pelo id do perfil
 * quando disponível, senão cai para o primeiro registro visível no escopo.
 */
export function useMyDepartmentQuery(departmentId?: string | null) {
  return useQuery<EducationDepartment | null>({
    queryKey: ['governance', 'my-department', departmentId ?? null],
    queryFn: async () => {
      if (departmentId) {
        return fetchEducationDepartment(departmentId)
      }
      const page = await fetchEducationDepartments()
      return page?.results?.[0] ?? null
    },
  })
}

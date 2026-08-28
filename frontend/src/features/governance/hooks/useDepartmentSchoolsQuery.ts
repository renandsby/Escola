import { useQuery } from '@tanstack/react-query'
import { fetchSchoolsByDepartment } from '../api/schoolsApi'

/** Lista as escolas de uma secretaria; inativa até haver um id. */
export function useDepartmentSchoolsQuery(departmentId?: string) {
  return useQuery({
    queryKey: ['governance', 'department-schools', departmentId],
    queryFn: () => fetchSchoolsByDepartment(departmentId as string),
    enabled: !!departmentId,
  })
}

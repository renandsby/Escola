import { useQuery } from '@tanstack/react-query'
import { fetchGrades } from '../api/gradesApi'

/**
 * Busca notas já lançadas para um período/disciplina, para pré-preencher o
 * formulário de lançamento em lote.
 */
export function useExistingGradesQuery(academicPeriodId: string, subjectId: string) {
  return useQuery({
    queryKey: ['grades', 'existing', academicPeriodId, subjectId],
    queryFn: () => fetchGrades({ academic_period: academicPeriodId, subject: subjectId }),
    enabled: !!academicPeriodId && !!subjectId,
  })
}

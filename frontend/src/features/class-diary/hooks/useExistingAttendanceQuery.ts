import { useQuery } from '@tanstack/react-query'
import { fetchAttendance } from '../api/attendanceApi'

/**
 * Busca registros de frequência já lançados para turma/data/disciplina, para
 * pré-preencher o formulário de lançamento em lote.
 */
export function useExistingAttendanceQuery(
  schoolClassId: string,
  date: string,
  subjectId: string
) {
  return useQuery({
    queryKey: ['attendance', 'existing', schoolClassId, date, subjectId],
    queryFn: () =>
      fetchAttendance({
        school_class: schoolClassId,
        date,
        subject: subjectId || undefined,
      }),
    enabled: !!schoolClassId && !!date,
  })
}

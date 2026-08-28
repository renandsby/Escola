import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import { Grade } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Edit, ClipboardList } from 'lucide-react'
import { apiPost, getErrorMessage } from '@/utils/api-helpers'
import { useSchoolClassesQuery } from '../hooks/useSchoolClassesQuery'
import { useSubjectsQuery } from '../hooks/useSubjectsQuery'
import { useAcademicPeriodsQuery } from '../hooks/useAcademicPeriodsQuery'
import { useEnrollmentRosterQuery } from '../hooks/useEnrollmentRosterQuery'
import { useExistingGradesQuery } from '../hooks/useExistingGradesQuery'

const SKELETON_ROWS = 5

interface GradeRowState {
  score: string
  recovery_score: string
  final_score: string
}

const scoreToFieldValue = (value: number | null | undefined) =>
  typeof value === 'number' ? String(value) : ''

export default function GradesPage() {
  const queryClient = useQueryClient()
  const { list } = useCrud<Grade>('grades/', 'grades')
  const [searchTerm, setSearchTerm] = useState('')

  const [showEntrySheet, setShowEntrySheet] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedPeriodId, setSelectedPeriodId] = useState('')

  const [rows, setRows] = useState<Record<string, GradeRowState>>({})
  const [saving, setSaving] = useState(false)

  const classesQuery = useSchoolClassesQuery()
  const subjectsQuery = useSubjectsQuery()
  const periodsQuery = useAcademicPeriodsQuery()
  const classes = classesQuery.data?.results || []
  const subjects = subjectsQuery.data?.results || []
  const periods = periodsQuery.data?.results || []

  const rosterQuery = useEnrollmentRosterQuery(selectedClassId)
  const existingGradesQuery = useExistingGradesQuery(selectedPeriodId, selectedSubjectId)
  const roster = rosterQuery.data?.results || []
  const rosterLoading = rosterQuery.isLoading || existingGradesQuery.isLoading

  const canShowRoster = !!(selectedClassId && selectedSubjectId && selectedPeriodId)

  useEffect(() => {
    if (!canShowRoster) {
      setRows({})
      return
    }
    if (!rosterQuery.data) {
      return
    }

    const enrollments = rosterQuery.data.results || []
    const existingGrades = existingGradesQuery.data?.results || []

    const initialRows: Record<string, GradeRowState> = {}
    enrollments.forEach((enrollment) => {
      const existing = existingGrades.find((g) => g.enrollment === enrollment.id)
      initialRows[enrollment.id] = {
        score: scoreToFieldValue(existing?.score),
        recovery_score: scoreToFieldValue(existing?.recovery_score),
        final_score: scoreToFieldValue(existing?.final_score),
      }
    })

    setRows(initialRows)
  }, [canShowRoster, rosterQuery.data, existingGradesQuery.data])

  const filteredData =
    list.data?.results?.filter(
      (grade: Grade) =>
        grade.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grade.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grade.academic_period_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  const handleRowChange = (
    enrollmentId: string,
    field: keyof GradeRowState,
    value: string
  ) => {
    setRows((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: value,
      },
    }))
  }

  const resetEntrySheet = () => {
    setShowEntrySheet(false)
    setSelectedClassId('')
    setSelectedSubjectId('')
    setSelectedPeriodId('')
    setRows({})
  }

  const handleSaveGrades = async () => {
    const items = Object.entries(rows)
      .filter(([, row]) => row.score.trim() !== '')
      .map(([enrollmentId, row]) => ({
        enrollment: enrollmentId,
        subject: selectedSubjectId,
        academic_period: selectedPeriodId,
        score: Number(row.score),
        recovery_score: row.recovery_score.trim() !== '' ? Number(row.recovery_score) : undefined,
        final_score: row.final_score.trim() !== '' ? Number(row.final_score) : undefined,
      }))

    if (items.length === 0) {
      toast.error('Informe ao menos uma nota antes de salvar')
      return
    }

    try {
      setSaving(true)
      await apiPost('grades/batch-upsert/', { items })
      queryClient.invalidateQueries({ queryKey: ['grades', 'list'] })
      toast.success('Notas salvas com sucesso!')
      resetEntrySheet()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (list.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar notas</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Notas</h1>
        <Button onClick={() => setShowEntrySheet((prev) => !prev)}>
          <ClipboardList className="w-4 h-4 mr-1" />
          Lançar Notas
        </Button>
      </div>

      {showEntrySheet && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Lançamento de Notas</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Turma</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.school_name ? `— ${c.school_name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Disciplina</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Período</label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.academic_year_label ? `(${p.academic_year_label})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {canShowRoster && (
            <div className="pt-2">
              {rosterLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={`roster-skeleton-${index}`} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="overflow-hidden border border-gray-200 rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Aluno</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-700">Nota</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-700">
                            Recuperação
                          </th>
                          <th className="px-4 py-2 text-center font-medium text-gray-700">
                            Nota Final
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {roster.map((enrollment) => (
                          <tr key={enrollment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-900">{enrollment.student_name}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={rows[enrollment.id]?.score ?? ''}
                                onChange={(e) =>
                                  handleRowChange(enrollment.id, 'score', e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={rows[enrollment.id]?.recovery_score ?? ''}
                                onChange={(e) =>
                                  handleRowChange(enrollment.id, 'recovery_score', e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={rows[enrollment.id]?.final_score ?? ''}
                                onChange={(e) =>
                                  handleRowChange(enrollment.id, 'final_score', e.target.value)
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                              />
                            </td>
                          </tr>
                        ))}
                        {roster.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                              Nenhum aluno matriculado nesta turma
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <Button onClick={handleSaveGrades} disabled={saving || roster.length === 0}>
                      Salvar Notas
                    </Button>
                    <Button type="button" variant="outline" onClick={resetEntrySheet}>
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar aluno, disciplina ou período..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Aluno</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Disciplina</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Período</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Nota</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Efetiva</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Skeleton className="h-4 w-10 mx-auto" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Skeleton className="h-4 w-10 mx-auto" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </td>
                </tr>
              ))}

            {!list.isLoading &&
              filteredData.map((grade: Grade) => (
                <tr key={grade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{grade.student_name}</td>
                  <td className="px-4 py-3 text-gray-600">{grade.subject_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {grade.academic_period_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {typeof grade.score === 'number' ? grade.score.toFixed(1) : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {typeof grade.effective_score === 'number'
                      ? grade.effective_score.toFixed(1)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" disabled title="Edição em lote via API">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            {!list.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma nota encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Attendance,
  ATTENDANCE_STATUS_LABELS,
  AttendanceStatus,
} from '@/types/api'
import { formatDate } from '@/utils/formatting'
import { apiPost, getErrorMessage } from '@/utils/api-helpers'
import { Plus, CheckCheck } from 'lucide-react'
import { useSchoolClassesQuery } from '../hooks/useSchoolClassesQuery'
import { useSubjectsQuery } from '../hooks/useSubjectsQuery'
import { useEnrollmentRosterQuery } from '../hooks/useEnrollmentRosterQuery'
import { useExistingAttendanceQuery } from '../hooks/useExistingAttendanceQuery'

const SKELETON_ROWS = 5

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Presente' },
  { value: 'ABSENT', label: 'Falta' },
  { value: 'EXCUSED_ABSENCE', label: 'Falta Justificada' },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-100 text-green-800'
    case 'ABSENT':
      return 'bg-red-100 text-red-800'
    case 'EXCUSED_ABSENCE':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const { list } = useCrud<Attendance>('attendance/', 'attendance')
  const [searchTerm, setSearchTerm] = useState('')

  // ---- Lançar Frequência (batch entry) state ----
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [rowStatus, setRowStatus] = useState<Record<string, AttendanceStatus | undefined>>({})
  const [saving, setSaving] = useState(false)

  const classesQuery = useSchoolClassesQuery()
  const subjectsQuery = useSubjectsQuery()
  const classes = classesQuery.data?.results || []
  const subjects = subjectsQuery.data?.results || []

  const rosterQuery = useEnrollmentRosterQuery(selectedClassId)
  const existingAttendanceQuery = useExistingAttendanceQuery(
    selectedClassId,
    selectedDate,
    selectedSubjectId
  )
  const roster = rosterQuery.data?.results || []
  const loadingRoster = rosterQuery.isLoading || existingAttendanceQuery.isLoading

  useEffect(() => {
    if (!selectedClassId || !selectedDate) {
      setRowStatus({})
      return
    }
    if (!rosterQuery.data) {
      return
    }

    const enrollments = rosterQuery.data.results || []
    const existing = existingAttendanceQuery.data?.results || []

    const nextStatus: Record<string, AttendanceStatus | undefined> = {}
    enrollments.forEach((enrollment) => {
      const match = existing.find((att) => att.enrollment === enrollment.id)
      nextStatus[enrollment.id] = match?.status
    })

    setRowStatus(nextStatus)
  }, [selectedClassId, selectedDate, rosterQuery.data, existingAttendanceQuery.data])

  const filteredData =
    list.data?.results?.filter((att: Attendance) =>
      att.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  const handleToggleEntryForm = () => {
    setShowEntryForm((prev) => !prev)
  }

  const handleSetRowStatus = (enrollmentId: string, status: AttendanceStatus) => {
    setRowStatus((prev) => ({
      ...prev,
      [enrollmentId]: prev[enrollmentId] === status ? undefined : status,
    }))
  }

  const handleMarkAllPresent = () => {
    setRowStatus((prev) => {
      const next = { ...prev }
      roster.forEach((enrollment) => {
        if (!next[enrollment.id]) {
          next[enrollment.id] = 'PRESENT'
        }
      })
      return next
    })
  }

  const handleSaveAttendance = async () => {
    const items = roster
      .filter((enrollment) => rowStatus[enrollment.id])
      .map((enrollment) => ({
        enrollment: enrollment.id,
        school_class: selectedClassId,
        subject: selectedSubjectId || null,
        date: selectedDate,
        status: rowStatus[enrollment.id] as AttendanceStatus,
      }))

    if (items.length === 0) {
      toast.error('Marque a frequência de ao menos um aluno antes de salvar')
      return
    }

    try {
      setSaving(true)
      await apiPost('attendance/batch-upsert/', { items })
      toast.success('Frequência salva com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] })
      setShowEntryForm(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (list.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar frequência</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Frequência</h1>
        <Button onClick={handleToggleEntryForm}>
          <Plus className="w-4 h-4 mr-1" />
          Lançar Frequência
        </Button>
      </div>

      {showEntryForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Lançar Frequência</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Turma</label>
              <select
                required
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.school_name ? ` — ${c.school_name}` : ''}
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
                <option value="">Frequência diária (sem disciplina)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {selectedClassId && selectedDate && (
            <div className="space-y-3">
              {loadingRoster ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={`roster-skeleton-${index}`} className="h-10 w-full" />
                  ))}
                </div>
              ) : roster.length === 0 ? (
                <div className="text-gray-500 py-4">Nenhum aluno matriculado nesta turma</div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">{roster.length} aluno(s)</p>
                    <Button type="button" variant="outline" size="sm" onClick={handleMarkAllPresent}>
                      <CheckCheck className="w-4 h-4 mr-1" />
                      Marcar todos como presentes
                    </Button>
                  </div>

                  <div className="border border-gray-200 rounded-md divide-y">
                    {roster.map((enrollment) => {
                      const currentStatus = rowStatus[enrollment.id]
                      return (
                        <div
                          key={enrollment.id}
                          className="flex items-center justify-between px-4 py-2"
                        >
                          <span className="text-gray-900">{enrollment.student_name}</span>
                          <div className="flex space-x-2">
                            {STATUS_OPTIONS.map((option) => {
                              const isActive = currentStatus === option.value
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleSetRowStatus(enrollment.id, option.value)}
                                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                    isActive
                                      ? `${getStatusColor(option.value)} border-transparent`
                                      : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex space-x-4 pt-2">
            <Button
              type="button"
              disabled={saving || roster.length === 0}
              onClick={handleSaveAttendance}
            >
              Salvar Frequência
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowEntryForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar aluno..."
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
              <th className="px-4 py-3 text-left font-medium text-gray-700">Turma</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Disciplina</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
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
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </td>
                </tr>
              ))}

            {!list.isLoading &&
              filteredData.map((attendance: Attendance) => (
                <tr key={attendance.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{attendance.student_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {attendance.school_class_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(attendance.date)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {attendance.subject_name || 'Diária'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(attendance.status)}`}
                    >
                      {ATTENDANCE_STATUS_LABELS[attendance.status] || attendance.status}
                    </span>
                  </td>
                </tr>
              ))}
            {!list.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import type { Student, Grade, Attendance, PaginatedResponse } from '@/types/api'
import { ATTENDANCE_STATUS_LABELS } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ArrowLeft, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const student = useQuery({
    queryKey: ['student', id],
    queryFn: () => apiGet<Student>(`students/${id}/`),
    enabled: !!id,
  })

  const grades = useQuery({
    queryKey: ['grades', id],
    queryFn: () => apiGet<PaginatedResponse<Grade>>(`grades/?student=${id}`),
    enabled: !!id,
  })

  const attendance = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => apiGet<PaginatedResponse<Attendance>>(`attendance/?student=${id}`),
    enabled: !!id,
  })

  if (student.isLoading || grades.isLoading || attendance.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-64" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`stat-skeleton-${index}`} className="bg-white rounded-lg shadow p-6 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (student.isError || !student.data) {
    return <div className="p-6 text-red-600">Erro ao carregar aluno</div>
  }

  const data = student.data
  const gradesList = grades.data?.results || []
  const attendanceList = attendance.data?.results || []

  const totalClasses = attendanceList.length
  const presentDays = attendanceList.filter((a) => a.status === 'PRESENT').length
  const absentDays = attendanceList.filter((a) => a.status === 'ABSENT').length
  const excusedDays = attendanceList.filter((a) => a.status === 'EXCUSED_ABSENCE').length
  const attendancePercent =
    totalClasses > 0 ? ((presentDays / totalClasses) * 100).toFixed(1) : 0

  const avgGrade =
    gradesList.length > 0
      ? (
          gradesList.reduce(
            (sum, g) => sum + Number(g.effective_score ?? g.score ?? 0),
            0
          ) / gradesList.length
        ).toFixed(1)
      : 0

  const gradesChartData = gradesList.map((g) => ({
    subject: g.subject_name || '—',
    nota: Number(g.effective_score ?? g.score ?? 0),
    period: g.academic_period_name || '',
  }))

  const frequencyData = [
    { name: ATTENDANCE_STATUS_LABELS.PRESENT, value: presentDays, fill: '#10b981' },
    { name: ATTENDANCE_STATUS_LABELS.ABSENT, value: absentDays, fill: '#ef4444' },
    { name: ATTENDANCE_STATUS_LABELS.EXCUSED_ABSENCE, value: excusedDays, fill: '#f59e0b' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Boletim — {data.full_name}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">ID Municipal</p>
          <p className="text-xl font-bold text-gray-900">{data.unique_municipal_id}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Média Geral</p>
          <p className="text-2xl font-bold text-blue-600">{avgGrade}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Frequência</p>
          <p className="text-2xl font-bold text-green-600">{attendancePercent}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Nome da mãe</p>
          <p className="text-lg font-semibold text-gray-900">{data.mother_name}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas por disciplina</h2>
        {gradesList.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="nota" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Disciplina</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Período</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Nota</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Recuperação</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Nota efetiva</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {gradesList.map((grade) => (
                    <tr key={grade.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{grade.subject_name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {grade.academic_period_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">{grade.score ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {grade.recovery_score ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {grade.effective_score ?? grade.score ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-center py-8">Sem notas registradas</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo de frequência</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={frequencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-gray-600">{ATTENDANCE_STATUS_LABELS.PRESENT}</p>
              <p className="text-3xl font-bold text-green-600">{presentDays}</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-gray-600">{ATTENDANCE_STATUS_LABELS.ABSENT}</p>
              <p className="text-3xl font-bold text-red-600">{absentDays}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-gray-600">
                {ATTENDANCE_STATUS_LABELS.EXCUSED_ABSENCE}
              </p>
              <p className="text-3xl font-bold text-amber-600">{excusedDays}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => window.print()}>
          <Download className="w-4 h-4 mr-2" />
          Imprimir Boletim
        </Button>
      </div>
    </div>
  )
}

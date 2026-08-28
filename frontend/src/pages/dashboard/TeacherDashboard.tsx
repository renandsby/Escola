import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import type { SchoolClass, Grade, Attendance, PaginatedResponse } from '@/types/api'
import { SHIFT_LABELS } from '@/types/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function TeacherDashboard() {
  const classes = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiGet<PaginatedResponse<SchoolClass>>('classes/'),
  })

  const grades = useQuery({
    queryKey: ['grades'],
    queryFn: () => apiGet<PaginatedResponse<Grade>>('grades/'),
  })

  const attendance = useQuery({
    queryKey: ['attendance'],
    queryFn: () => apiGet<PaginatedResponse<Attendance>>('attendance/'),
  })

  if (classes.isLoading || grades.isLoading) {
    return <div className="p-6">Carregando...</div>
  }

  const classList = classes.data?.results || []
  const gradesList = grades.data?.results || []
  const attendanceList = attendance.data?.results || []

  const totalStudents = classList.reduce((sum, c) => sum + (c.student_count || 0), 0)
  const avgGrade =
    gradesList.length > 0
      ? (
          gradesList.reduce(
            (sum, g) => sum + Number(g.effective_score ?? g.score ?? 0),
            0
          ) / gradesList.length
        ).toFixed(1)
      : 0
  const avgAttendance =
    attendanceList.length > 0
      ? (
          (attendanceList.filter((a) => a.status === 'PRESENT').length /
            attendanceList.length) *
          100
        ).toFixed(1)
      : 0

  const gradesBySubject = gradesList
    .reduce<{ subject: string; total: number; count: number }[]>((acc, grade) => {
      const name = grade.subject_name || '—'
      const existing = acc.find((item) => item.subject === name)
      const value = Number(grade.effective_score ?? grade.score ?? 0)
      if (existing) {
        existing.total += value
        existing.count += 1
      } else {
        acc.push({ subject: name, total: value, count: 1 })
      }
      return acc
    }, [])
    .map((item) => ({
      subject: item.subject,
      media: (item.total / item.count).toFixed(1),
    }))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard do Professor</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Minhas Turmas</p>
          <p className="text-3xl font-bold text-blue-600">{classList.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total de Alunos</p>
          <p className="text-3xl font-bold text-green-600">{totalStudents}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Média de Notas</p>
          <p className="text-3xl font-bold text-purple-600">{avgGrade}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Frequência Média</p>
          <p className="text-3xl font-bold text-orange-600">{avgAttendance}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Média de Notas por Disciplina
        </h2>
        {gradesBySubject.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gradesBySubject}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Bar dataKey="media" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-600 text-center py-8">Sem notas registradas</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Minhas Turmas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classList.map((cls) => (
            <div
              key={cls.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <h3 className="font-semibold text-gray-900">{cls.name}</h3>
              <p className="text-sm text-gray-600">
                {SHIFT_LABELS[cls.shift] || cls.shift}
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Alunos:</span>
                  <span className="font-medium">{cls.student_count || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${cls.is_active ? 'text-green-600' : 'text-gray-600'}`}
                  >
                    {cls.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

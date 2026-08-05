import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function TeacherDashboard() {
  const classes = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiGet('classes/') as Promise<any>,
  })

  const grades = useQuery({
    queryKey: ['grades'],
    queryFn: () => apiGet('grades/') as Promise<any>,
  })

  const attendance = useQuery({
    queryKey: ['attendance'],
    queryFn: () => apiGet('attendance/') as Promise<any>,
  })

  if (classes.isLoading || grades.isLoading) {
    return <div className="p-6">Carregando...</div>
  }

  const classList = (classes.data as any)?.results || []
  const gradesList = (grades.data as any)?.results || []
  const attendanceList = (attendance.data as any)?.results || []

  const totalStudents = classList.reduce((sum: number, c: any) => sum + (c.student_count || 0), 0)
  const avgGrade = gradesList.length > 0
    ? (gradesList.reduce((sum: number, g: any) => sum + (g.average || 0), 0) / gradesList.length).toFixed(1)
    : 0
  const avgAttendance = attendanceList.length > 0
    ? ((attendanceList.filter((a: any) => a.status === 'present').length / attendanceList.length) * 100).toFixed(1)
    : 0

  const gradesBySubject = gradesList.reduce((acc: any, grade: any) => {
    const existing = acc.find((item: any) => item.subject === grade.subject_name)
    if (existing) {
      existing.total += grade.average || 0
      existing.count += 1
    } else {
      acc.push({ subject: grade.subject_name, total: grade.average || 0, count: 1 })
    }
    return acc
  }, []).map((item: any) => ({
    subject: item.subject,
    media: (item.total / item.count).toFixed(1),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard do Professor</h1>

      <div className="grid grid-cols-4 gap-4">
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Média de Notas por Disciplina</h2>
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
          {classList.map((cls: any) => (
            <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <h3 className="font-semibold text-gray-900">{cls.name}</h3>
              <p className="text-sm text-gray-600">{cls.grade_level}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Alunos:</span>
                  <span className="font-medium">{cls.student_count || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${cls.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                    {cls.status === 'active' ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-gray-600">Aprovados</p>
            <p className="text-2xl font-bold text-green-600">
              {gradesList.filter((g: any) => g.status === 'approved').length}
            </p>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-gray-600">Reprovados</p>
            <p className="text-2xl font-bold text-red-600">
              {gradesList.filter((g: any) => g.status === 'failed').length}
            </p>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-gray-600">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">
              {gradesList.filter((g: any) => g.status === 'pending').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

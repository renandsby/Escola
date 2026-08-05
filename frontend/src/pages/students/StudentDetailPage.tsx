import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import { Student } from '@/types/api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const student = useQuery({
    queryKey: ['student', id],
    queryFn: () => apiGet(`students/${id}/`) as Promise<Student>,
    enabled: !!id,
  })

  const grades = useQuery({
    queryKey: ['grades', id],
    queryFn: () => apiGet(`grades/?student=${id}`) as Promise<any>,
    enabled: !!id,
  })

  const attendance = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => apiGet(`attendance/?student=${id}`) as Promise<any>,
    enabled: !!id,
  })

  if (student.isLoading || grades.isLoading || attendance.isLoading) {
    return <div className="p-6">Carregando...</div>
  }

  if (student.isError || !student.data) {
    return <div className="p-6 text-red-600">Erro ao carregar aluno</div>
  }

  const data = student.data as any
  const gradesList = grades.data?.results || []
  const attendanceList = attendance.data?.results || []

  // Calcula estatísticas
  const totalClasses = attendanceList.length
  const presentDays = attendanceList.filter((a: any) => a.status === 'present').length
  const absentDays = attendanceList.filter((a: any) => a.status === 'absent').length
  const justifiedDays = attendanceList.filter((a: any) => a.status === 'justified').length
  const attendancePercent = totalClasses > 0 ? ((presentDays / totalClasses) * 100).toFixed(1) : 0

  const avgGrade = gradesList.length > 0
    ? (gradesList.reduce((sum: number, g: any) => sum + (g.average || 0), 0) / gradesList.length).toFixed(1)
    : 0

  // Dados para gráfico de notas
  const gradesChartData = gradesList.map((g: any) => ({
    subject: g.subject_name,
    media: parseFloat(g.average) || 0,
    status: g.status,
  }))

  // Dados para gráfico de frequência
  const frequencyData = [
    { name: 'Presente', value: presentDays, fill: '#10b981' },
    { name: 'Ausente', value: absentDays, fill: '#ef4444' },
    { name: 'Justificado', value: justifiedDays, fill: '#f59e0b' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Boletim - {data.user_name}</h1>
      </div>

      {/* Resumo do Aluno */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Matrícula</p>
          <p className="text-2xl font-bold text-gray-900">{data.registration_number}</p>
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
          <p className="text-sm text-gray-600">Status</p>
          <p className={`text-2xl font-bold ${data.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
            {data.status === 'active' ? 'Ativo' : 'Inativo'}
          </p>
        </div>
      </div>

      {/* Notas por Disciplina */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Desempenho por Disciplina</h2>
        {gradesList.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="media" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Disciplina</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">1º Período</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">2º Período</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">3º Período</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">4º Período</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Média</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {gradesList.map((grade: any) => (
                    <tr key={grade.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{grade.subject_name}</td>
                      <td className="px-4 py-3 text-center">{grade.first_period || '-'}</td>
                      <td className="px-4 py-3 text-center">{grade.second_period || '-'}</td>
                      <td className="px-4 py-3 text-center">{grade.third_period || '-'}</td>
                      <td className="px-4 py-3 text-center">{grade.fourth_period || '-'}</td>
                      <td className="px-4 py-3 text-center font-medium">{grade.average?.toFixed(1) || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          grade.status === 'approved' ? 'bg-green-100 text-green-800'
                            : grade.status === 'failed' ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {grade.status === 'approved' ? 'Aprovado'
                            : grade.status === 'failed' ? 'Reprovado'
                              : 'Pendente'}
                        </span>
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

      {/* Frequência */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Frequência</h2>
        <div className="grid grid-cols-2 gap-6">
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
              <p className="text-sm text-gray-600">Dias Presentes</p>
              <p className="text-3xl font-bold text-green-600">{presentDays}</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-gray-600">Dias Ausentes</p>
              <p className="text-3xl font-bold text-red-600">{absentDays}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-gray-600">Dias Justificados</p>
              <p className="text-3xl font-bold text-amber-600">{justifiedDays}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <Button onClick={() => window.print()}>
          <Download className="w-4 h-4 mr-2" />
          Imprimir Boletim
        </Button>
      </div>
    </div>
  )
}

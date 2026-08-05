import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import { Button } from '@/components/ui/button'
import { DownloadCloud } from 'lucide-react'

export default function BoletimPage() {
  const [classId, setClassId] = useState('')

  const students = useQuery({
    queryKey: ['students'],
    queryFn: () => apiGet(`students/`) as Promise<any>,
  })

  const classes = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiGet(`classes/`) as Promise<any>,
  })

  const grades = useQuery({
    queryKey: ['grades'],
    queryFn: () => apiGet(`grades/`) as Promise<any>,
  })

  if (students.isLoading || classes.isLoading) {
    return <div className="p-6">Carregando...</div>
  }

  const studentList = students.data?.results || []
  const classList = classes.data?.results || []
  const gradesList = grades.data?.results || []

  const filteredStudents = classId
    ? studentList.filter((s: any) => {
        const enrollment = gradesList.find((g: any) => g.class_name)
        return enrollment?.student === s.id
      })
    : studentList

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Boletins Consolidados</h1>
        <Button onClick={() => window.print()}>
          <DownloadCloud className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as turmas</option>
              {classList.map((cls: any) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.grade_level}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Boletins */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700">Matrícula</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">Aluno</th>
              <th className="px-6 py-3 text-center font-medium text-gray-700">Média Geral</th>
              <th className="px-6 py-3 text-center font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-center font-medium text-gray-700">Aprovação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredStudents.map((student: any) => {
              const studentGrades = gradesList.filter((g: any) => g.student === student.id)
              const avgGrade = studentGrades.length > 0
                ? (studentGrades.reduce((sum: number, g: any) => sum + (g.average || 0), 0) / studentGrades.length).toFixed(1)
                : '-'
              const approvedCount = studentGrades.filter((g: any) => g.status === 'approved').length
              const totalDisciplines = studentGrades.length
              const approvalPercent = totalDisciplines > 0 ? Math.round((approvedCount / totalDisciplines) * 100) : 0

              return (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{student.registration_number}</td>
                  <td className="px-6 py-4 text-gray-900">{student.user_name}</td>
                  <td className="px-6 py-4 text-center font-medium text-lg">
                    <span className={avgGrade !== '-' && parseFloat(avgGrade as string) >= 6 ? 'text-green-600' : 'text-red-600'}>
                      {avgGrade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      student.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            approvalPercent >= 70 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${approvalPercent}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{approvalPercent}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total de Alunos</p>
          <p className="text-3xl font-bold text-blue-600">{filteredStudents.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Média Geral</p>
          <p className="text-3xl font-bold text-purple-600">
            {filteredStudents.length > 0
              ? (filteredStudents.reduce((sum: number, s: any) => {
                  const studentGrades = gradesList.filter((g: any) => g.student === s.id)
                  const avg = studentGrades.length > 0
                    ? studentGrades.reduce((sum: number, g: any) => sum + (g.average || 0), 0) / studentGrades.length
                    : 0
                  return sum + avg
                }, 0) / filteredStudents.length).toFixed(1)
              : '-'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Taxa de Aprovação</p>
          <p className="text-3xl font-bold text-green-600">
            {gradesList.length > 0
              ? Math.round((gradesList.filter((g: any) => g.status === 'approved').length / gradesList.length) * 100)
              : 0}%
          </p>
        </div>
      </div>
    </div>
  )
}

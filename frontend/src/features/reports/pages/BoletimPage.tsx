import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { DownloadCloud } from 'lucide-react'
import { SHIFT_LABELS } from '@/types/api'
import { useBoletimData } from '../hooks/useBoletimData'

export default function BoletimPage() {
  const [classId, setClassId] = useState('')
  const { students, classes, grades, enrollments } = useBoletimData(classId)

  if (students.isLoading || classes.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (students.isError || classes.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar dados dos boletins</div>
  }

  const studentList = students.data?.results ?? []
  const classList = classes.data?.results ?? []
  const gradesList = grades.data?.results ?? []
  const enrollmentList = enrollments.data?.results ?? []

  const enrolledStudentIds = new Set(enrollmentList.map((e) => e.student))
  const filteredStudents = classId
    ? studentList.filter((s) => enrolledStudentIds.has(s.id))
    : studentList

  const studentAvg = (studentId: string) => {
    const byEnrollment = gradesList.filter((g) =>
      enrollmentList.some((e) => e.id === g.enrollment && e.student === studentId)
    )
    const relevant =
      byEnrollment.length > 0
        ? byEnrollment
        : gradesList.filter(
            (g) =>
              g.student_name &&
              studentList.find((s) => s.id === studentId)?.full_name === g.student_name
          )
    if (relevant.length === 0) {
      return null
    }
    return (
      relevant.reduce((sum, g) => sum + Number(g.effective_score ?? g.score ?? 0), 0) /
      relevant.length
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Boletins Consolidados</h1>
        <Button onClick={() => window.print()}>
          <DownloadCloud className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

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
              {classList.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} — {SHIFT_LABELS[cls.shift] || cls.shift}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700">ID Municipal</th>
              <th className="px-6 py-3 text-left font-medium text-gray-700">Aluno</th>
              <th className="px-6 py-3 text-center font-medium text-gray-700">Média Geral</th>
              <th className="px-6 py-3 text-center font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredStudents.map((student) => {
              const avg = studentAvg(student.id)
              const avgLabel = avg !== null ? avg.toFixed(1) : '—'

              return (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{student.unique_municipal_id}</td>
                  <td className="px-6 py-4 text-gray-900">{student.full_name}</td>
                  <td className="px-6 py-4 text-center font-medium text-lg">
                    <span className={avg !== null && avg >= 6 ? 'text-green-600' : 'text-red-600'}>
                      {avgLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        student.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {student.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              )
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Nenhum aluno encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total de Alunos</p>
          <p className="text-3xl font-bold text-blue-600">{filteredStudents.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Registros de notas</p>
          <p className="text-3xl font-bold text-purple-600">{gradesList.length}</p>
        </div>
      </div>
    </div>
  )
}

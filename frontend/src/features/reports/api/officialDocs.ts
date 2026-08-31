import { apiClient } from '@/services/api'

/** Dispara o download de um arquivo devolvido por um endpoint que responde binário. */
async function downloadFile(url: string, params: Record<string, string | undefined>, fallbackName: string) {
  const res = await apiClient.get(url, { params, responseType: 'blob' })
  const disposition = String(res.headers['content-disposition'] ?? '')
  const match = disposition.match(/filename="?([^"]+)"?/)
  const name = match?.[1] ?? fallbackName
  const blobUrl = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = name
  a.click()
  URL.revokeObjectURL(blobUrl)
}

export function downloadBoletimPdf(studentId?: string) {
  return downloadFile('/reports/boletim_pdf/', { student_id: studentId }, 'boletim.pdf')
}

export function downloadCarteirinhaPdf(studentId?: string) {
  return downloadFile('/reports/carteirinha_pdf/', { student_id: studentId }, 'carteirinha.pdf')
}

export function downloadHistoricoPdf(studentId?: string) {
  return downloadFile('/reports/historico_pdf/', { student_id: studentId }, 'historico_escolar.pdf')
}

export function downloadRelatorioExcel(schoolId?: string) {
  return downloadFile('/reports/relatorio_excel/', { school: schoolId }, 'relatorio_notas.xlsx')
}

export function downloadRelatorioCsv(schoolId?: string) {
  return downloadFile('/reports/relatorio_csv/', { school: schoolId }, 'relatorio_notas.csv')
}

export function downloadEducacensoExport(departmentId?: string) {
  return downloadFile('/reports/educacenso-export/', { department: departmentId }, 'educacenso.csv')
}

export function downloadEducacensoArchive(academicYearId?: string) {
  return downloadFile(
    '/reports/educacenso/export/',
    { academic_year_id: academicYearId },
    'educacenso.zip'
  )
}

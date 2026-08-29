import { apiClient } from '@/services/api'

/** Baixa um relatório síncrono existente (FileResponse do backend). */
export async function downloadReport(
  path: string,
  filename: string,
  params?: Record<string, string>
) {
  const res = await apiClient.get(path, { params, responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

import { apiClient } from '@/services/api'
import type { PaginatedResponse } from '@/types/api'
import type { CreateExecutionInput, ReportDef, ReportExecution } from '../types'

export async function fetchReportCatalog(): Promise<ReportDef[]> {
  const res = await apiClient.get<ReportDef[]>('/reports/catalog/')
  return res.data
}

export async function fetchExecutions(
  params: Record<string, string | number> = {}
): Promise<PaginatedResponse<ReportExecution>> {
  const res = await apiClient.get<PaginatedResponse<ReportExecution>>('/reports/executions/', {
    params,
  })
  return res.data
}

export async function fetchExecution(id: string): Promise<ReportExecution> {
  const res = await apiClient.get<ReportExecution>(`/reports/executions/${id}/`)
  return res.data
}

export async function createExecution(input: CreateExecutionInput): Promise<ReportExecution> {
  const res = await apiClient.post<ReportExecution>('/reports/executions/', input)
  return res.data
}

/** Segue o 302 para a URL assinada e baixa o arquivo. */
export async function downloadExecution(execution: ReportExecution): Promise<void> {
  const res = await apiClient.get(`/reports/executions/${execution.id}/download/`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${execution.report_key}.${execution.output_format.toLowerCase()}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

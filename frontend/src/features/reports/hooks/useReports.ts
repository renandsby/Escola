import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createExecution,
  fetchExecution,
  fetchExecutions,
  fetchReportCatalog,
} from '../api/reports'
import type { CreateExecutionInput, ReportExecution } from '../types'

const KEY = ['reports']

export function useReportCatalog() {
  return useQuery({
    queryKey: [...KEY, 'catalog'],
    queryFn: fetchReportCatalog,
    staleTime: 30 * 60_000,
  })
}

export function useExecutions(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: [...KEY, 'executions', params],
    queryFn: () => fetchExecutions(params),
    // enquanto houver execução em andamento, atualiza a lista
    refetchInterval: (query) =>
      query.state.data?.results.some((e: ReportExecution) =>
        ['QUEUED', 'PROCESSING'].includes(e.status)
      )
        ? 4000
        : false,
  })
}

/** Polling de uma execução: para em DONE/ERROR, teto de ~5 min. */
export function useExecutionPolling(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'execution', id],
    queryFn: () => fetchExecution(id as string),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as ReportExecution | undefined
      if (!data || ['DONE', 'ERROR'].includes(data.status)) {
        return false
      }
      const age = Date.now() - new Date(data.created_at).getTime()
      return age > 5 * 60_000 ? false : 4000
    },
  })
}

export function useCreateExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExecutionInput) => createExecution(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'executions'] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api-helpers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCrud<T>(endpoint: string, queryKey: string) {
  const queryClient = useQueryClient()

  const list = useQuery<any>({
    queryKey: [queryKey, 'list'],
    queryFn: () => apiGet(endpoint),
  })

  const create = useMutation({
    mutationFn: (data: Partial<T>) => apiPost(endpoint, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] })
    },
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
      apiPut(`${endpoint}${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] })
    },
  })

  const delete_ = useMutation({
    mutationFn: (id: string) => apiDelete(`${endpoint}${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] })
    },
  })

  return { list, create, update, delete_ }
}

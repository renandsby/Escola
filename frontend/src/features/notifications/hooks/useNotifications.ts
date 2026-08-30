import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { apiGet } from '@/utils/api-helpers'
import type { Notification, PaginatedResponse } from '@/types/api'

const UNREAD_KEY = ['notifications', 'unread-count']
const LIST_KEY = ['notifications', 'list']

export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => apiGet<{ unread: number }>('notifications/unread_count/'),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  })
}

export function useNotificationList(enabled: boolean) {
  return useQuery({
    queryKey: LIST_KEY,
    enabled,
    queryFn: () =>
      apiGet<PaginatedResponse<Notification>>('notifications/', { page_size: 15 }),
    retry: false,
  })
}

export function useNotificationActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: UNREAD_KEY })
    qc.invalidateQueries({ queryKey: LIST_KEY })
  }

  const markAllRead = useMutation({
    mutationFn: () => apiClient.post('/notifications/mark_all_read/'),
    onSuccess: invalidate,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.post(`/notifications/${id}/mark_read/`),
    onSuccess: invalidate,
  })

  return { markAllRead, markRead }
}

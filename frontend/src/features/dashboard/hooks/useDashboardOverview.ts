import { useQuery } from '@tanstack/react-query'
import { fetchDashboardOverview } from '../api/dashboardApi'
import type { OverviewParams } from '../types'

export function useDashboardOverview(params: OverviewParams) {
  return useQuery({
    queryKey: ['dashboard', 'overview', params],
    queryFn: () => fetchDashboardOverview(params),
    staleTime: 60_000,
  })
}

import { apiGet } from '@/utils/api-helpers'
import type { DashboardOverview, OverviewParams } from '../types'

export function fetchDashboardOverview(params: OverviewParams = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )
  return apiGet<DashboardOverview>('dashboard/overview/', clean)
}

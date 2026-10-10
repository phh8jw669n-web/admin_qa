import type { DashboardData } from '@/features/dashboard/types'
import { apiClient } from '@/lib/api-client'
import { mockDashboardData } from '@/lib/mock-data'

export const useMockApi = true

export async function fetchDashboardData(): Promise<DashboardData> {
  if (useMockApi) {
    return mockDashboardData
  }

  return apiClient<DashboardData>('/dashboard')
}

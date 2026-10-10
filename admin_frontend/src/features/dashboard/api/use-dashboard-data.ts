import { useQuery } from '@tanstack/react-query'

import { fetchDashboardData } from './fetch-dashboard-data'

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  })
}

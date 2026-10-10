import { useQuery } from '@tanstack/react-query'

import type { TestListFilters, TestListItem } from '@/features/test-manager/types'
import { defaultTestListFilters } from '@/features/test-manager/types'

import { fetchTestsList } from './fetch-tests-list'

export const testsQueryKey = ['tests'] as const

export function testsListQueryKey(filters: TestListFilters = defaultTestListFilters) {
  return [...testsQueryKey, 'list', filters] as const
}

export function useTestsList(filters: TestListFilters = defaultTestListFilters) {
  return useQuery({
    queryKey: testsListQueryKey(filters),
    queryFn: () => fetchTestsList(filters),
  })
}

export type { TestListItem }

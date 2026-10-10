import { useQuery } from '@tanstack/react-query'

import { fetchTest } from '@/features/test-manager/api/fetch-test'

export function testQueryKey(testId: string) {
  return ['tests', testId] as const
}

export function useTest(testId: string | null) {
  return useQuery({
    queryKey: testQueryKey(testId ?? ''),
    queryFn: () => fetchTest(testId!),
    enabled: Boolean(testId),
  })
}

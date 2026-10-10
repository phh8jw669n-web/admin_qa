import { useQuery } from '@tanstack/react-query'

import { fetchTestSettingsByTestId } from '@/features/test-manager/api/fetch-test-settings'

export function testSettingsQueryKey(testId: string) {
  return ['test-settings', 'test', testId] as const
}

export function useTestSettings(testId: string | null, enabled = true) {
  return useQuery({
    queryKey: testSettingsQueryKey(testId ?? ''),
    queryFn: () => fetchTestSettingsByTestId(testId!),
    enabled: Boolean(testId) && enabled,
  })
}

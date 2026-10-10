import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  assertApiSuccess,
  extractTestSettingsId,
  fetchTestSettingsByTestId,
} from '@/features/test-manager/api/fetch-test-settings'
import { testSettingsQueryKey } from '@/features/test-manager/api/use-test-settings'
import type {
  TestSettingsPayload,
  TestSettingsUpdatePayload,
} from '@/features/test-manager/lib/to-test-settings-payload'
import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function saveTestSettings(payload: TestSettingsPayload): Promise<{ id: string | null }> {
  if (useMockApi) {
    await delay(300)
    return { id: crypto.randomUUID() }
  }

  const response = await apiClient<unknown>('/test-settings', {
    method: 'POST',
    body: payload,
  })

  assertApiSuccess(response, 'Unable to save test settings')

  let id = extractTestSettingsId(response)
  if (!id) {
    const existing = await fetchTestSettingsByTestId(payload.testId)
    id = existing?.id ?? null
  }

  return { id }
}

export async function updateTestSettings({
  id,
  payload,
}: {
  id: string
  payload: TestSettingsUpdatePayload
}): Promise<{ id: string }> {
  if (useMockApi) {
    await delay(300)
    return { id }
  }

  const response = await apiClient<unknown>(`/test-settings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  })

  assertApiSuccess(response, 'Unable to update test settings')

  return { id }
}

export function useSaveTestSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveTestSettings,
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: testSettingsQueryKey(payload.testId) })
    },
  })
}

export function useUpdateTestSettings(testId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTestSettings,
    onSuccess: () => {
      if (testId) {
        void queryClient.invalidateQueries({ queryKey: testSettingsQueryKey(testId) })
      }
    },
  })
}

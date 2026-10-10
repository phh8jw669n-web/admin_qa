import { useMutation, useQueryClient } from '@tanstack/react-query'

import { testsQueryKey } from '@/features/test-manager/api/use-tests-list'
import { testQueryKey } from '@/features/test-manager/api/use-test'
import type { CreateTestPayload } from '@/features/test-manager/lib/to-create-test-payload'
import type { TestListItem } from '@/features/test-manager/types'
import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'
import { mockTests } from '@/lib/mock-data'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function extractCreatedTestId(payload: unknown): string {
  const root = asRecord(payload)
  if (!root) throw new Error('Unable to create test')

  if (root.success === false) {
    throw new Error(asString(root.message) || 'Unable to create test')
  }

  const nested = asRecord(root.data)
  const id =
    asString(root.id) ?? asString(nested?.id) ?? asString(root.testId) ?? asString(nested?.testId)

  if (!id) throw new Error(asString(root.message) || 'Unable to create test')
  return id
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function createTest(payload: CreateTestPayload): Promise<{ id: string }> {
  if (useMockApi) {
    await delay(400)
    return { id: crypto.randomUUID() }
  }

  const response = await apiClient<unknown>('/tests', {
    method: 'POST',
    body: payload,
  })

  return { id: extractCreatedTestId(response) }
}

export async function updateTest({
  id,
  payload,
}: {
  id: string
  payload: CreateTestPayload
}): Promise<{ id: string }> {
  if (useMockApi) {
    await delay(400)
    return { id }
  }

  const response = await apiClient<unknown>(`/tests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  })

  if (asRecord(response)?.success === false) {
    throw new Error(asString(asRecord(response)?.message) || 'Unable to update test')
  }

  return { id }
}

export async function deleteTest(id: string): Promise<string> {
  if (useMockApi) {
    await delay(350)
    const remaining = mockTests.filter((test) => test.id !== id)
    mockTests.splice(0, mockTests.length, ...remaining)
    return id
  }

  await apiClient<unknown>(`/tests/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return id
}

export async function deleteTests(ids: string[]): Promise<string[]> {
  await Promise.all(ids.map((id) => deleteTest(id)))
  return ids
}

export async function importQtiTest(file: File): Promise<TestListItem> {
  if (useMockApi) {
    await delay(400)
    const today = new Date().toISOString().slice(0, 10)
    const name = file.name.replace(/\.(xml|zip|qti)$/i, '').replace(/[-_]/g, ' ')

    const imported: TestListItem = {
      id: crypto.randomUUID(),
      name: name || 'Imported QTI',
      startDate: today,
      endDate: today,
      status: 'Draft',
      question: 0,
      testCategory: 'QTI Import',
      testTemplate: 'QTI Package',
      isActive: true,
      isPublished: false,
    }

    mockTests.unshift(imported)
    return imported
  }

  const body = new FormData()
  body.append('file', file)

  return apiClient<TestListItem>('/tests/import-qti', {
    method: 'POST',
    body,
  })
}

function useInvalidateTests(testId?: string) {
  const queryClient = useQueryClient()

  return () => {
    void queryClient.invalidateQueries({ queryKey: testsQueryKey })
    if (testId) {
      void queryClient.invalidateQueries({ queryKey: testQueryKey(testId) })
    }
  }
}

export function useCreateTest() {
  const invalidate = useInvalidateTests()

  return useMutation({
    mutationFn: createTest,
    onSuccess: invalidate,
  })
}

export function useUpdateTest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTest,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: testsQueryKey })
      void queryClient.invalidateQueries({ queryKey: testQueryKey(variables.id) })
    },
  })
}

export function useDeleteTests() {
  const invalidate = useInvalidateTests()

  return useMutation({
    mutationFn: deleteTests,
    onSuccess: invalidate,
  })
}

export function useImportQtiTest() {
  const invalidate = useInvalidateTests()

  return useMutation({
    mutationFn: importQtiTest,
    onSuccess: invalidate,
  })
}

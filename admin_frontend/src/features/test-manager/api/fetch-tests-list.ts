import type { TestListFilters, TestListItem } from '@/features/test-manager/types'
import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'
import { mockTests } from '@/lib/mock-data'

export { useMockApi }

const PAGE_SIZE = 20
const MAX_PAGES = 50

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return undefined
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function nestedName(value: unknown) {
  const record = asRecord(value)
  return asString(record?.name) ?? asString(record?.title) ?? asString(record?.label)
}

function toDateLabel(value: unknown) {
  const raw = asString(value)
  if (!raw) return ''
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? raw
}

function statusFromRecord(record: Record<string, unknown>) {
  const explicit = asString(record.status)
  if (explicit) return explicit
  if (asBoolean(record.isPublished)) return 'Published'
  if (asBoolean(record.isDraft)) return 'Draft'
  if (asBoolean(record.isActive) === false) return 'Inactive'
  return 'Draft'
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload

  const root = asRecord(payload)
  if (!root) return []

  if (root.success === false) {
    throw new Error(asString(root.message) || 'Unable to fetch tests')
  }

  const nested = asRecord(root.data)
  const candidates = [
    root.items,
    nested?.items,
    nested?.tests,
    root.tests,
    root.data,
    nested?.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

function extractTotalPages(payload: unknown): number | undefined {
  const root = asRecord(payload)
  const nested = asRecord(root?.data)
  const metadata = asRecord(nested?.metadata) ?? asRecord(nested?.meta) ?? asRecord(root?.metadata)
  const totalPages = asNumber(metadata?.totalPages)

  return totalPages && totalPages > 0 ? totalPages : undefined
}

function normalizeTestListItem(item: unknown): TestListItem | null {
  const record = asRecord(item)
  if (!record) return null

  const id = asString(record.id) ?? asString(record.testId)
  const name = asString(record.name)

  if (!id || !name) return null

  return {
    id,
    name,
    startDate: toDateLabel(record.startDate),
    endDate: toDateLabel(record.endDate),
    status: statusFromRecord(record),
    question: asNumber(record.totalQuestions) ?? asNumber(record.question) ?? 0,
    testCategory:
      nestedName(record.category) ?? asString(record.testCategory) ?? asString(record.categoryName) ?? '',
    testTemplate:
      nestedName(record.template) ?? asString(record.testTemplate) ?? asString(record.templateName) ?? '',
    isActive: asBoolean(record.isActive) ?? true,
    isPublished: asBoolean(record.isPublished) ?? false,
  }
}

function parseOptionalBoolean(value: string): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function toTestsQueryParams(filters: TestListFilters) {
  return {
    name: filters.name.trim() || undefined,
    testCode: filters.testCode.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    templateId: filters.templateId || undefined,
    isDraft: parseOptionalBoolean(filters.isDraft),
    isPublished: parseOptionalBoolean(filters.isPublished),
    isActive: parseOptionalBoolean(filters.isActive),
  }
}

function matchesMockFilters(test: TestListItem, filters: TestListFilters) {
  const name = filters.name.trim().toLowerCase()
  const testCode = filters.testCode.trim().toLowerCase()

  if (name && !test.name.toLowerCase().includes(name)) return false
  if (testCode && !test.name.toLowerCase().includes(testCode)) return false
  if (filters.categoryId && test.testCategory !== filters.categoryId) return false
  if (filters.templateId && test.testTemplate !== filters.templateId) return false
  if (filters.isDraft === 'true' && test.status.toLowerCase() !== 'draft') return false
  if (filters.isDraft === 'false' && test.status.toLowerCase() === 'draft') return false
  if (filters.isPublished === 'true' && !test.isPublished) return false
  if (filters.isPublished === 'false' && test.isPublished) return false
  if (filters.isActive === 'true' && !test.isActive) return false
  if (filters.isActive === 'false' && test.isActive) return false

  return true
}

async function fetchTestsPage(page: number, filters: TestListFilters) {
  const payload = await apiClient<unknown>('/tests', {
    params: { page, limit: PAGE_SIZE, ...toTestsQueryParams(filters) },
  })

  return {
    items: extractList(payload),
    totalPages: extractTotalPages(payload),
  }
}

export async function fetchTestsList(filters: TestListFilters): Promise<TestListItem[]> {
  if (useMockApi) {
    return mockTests.filter((test) => matchesMockFilters(test, filters)).map((test) => ({ ...test }))
  }

  const tests: TestListItem[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { items, totalPages } = await fetchTestsPage(page, filters)

    for (const item of items) {
      const test = normalizeTestListItem(item)
      if (test) tests.push(test)
    }

    if (totalPages && page >= totalPages) break
    if (items.length < PAGE_SIZE) break
  }

  return tests
}

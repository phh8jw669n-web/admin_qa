import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'

export type SelectOption = {
  value: string
  label: string
  subjectId?: string
}

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

function nestedId(value: unknown) {
  return asString(asRecord(value)?.id)
}

function extractList(payload: unknown, extraKeys: string[] = []): unknown[] {
  if (Array.isArray(payload)) return payload

  const root = asRecord(payload)
  if (!root) return []

  const nested = asRecord(root.data)
  const candidates: unknown[] = [
    root.items,
    root.data,
    root.records,
    root.results,
    root.rows,
    nested?.items,
    nested?.data,
    nested?.records,
    nested?.results,
    nested?.rows,
    ...extraKeys.map((key) => root[key]),
    ...extraKeys.map((key) => nested?.[key]),
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

function isInactive(record: Record<string, unknown>) {
  if (record.isActive === false) return true
  const status = asString(record.status)?.toLowerCase()
  return status === 'inactive' || status === 'disabled'
}

function normalizeOption(
  item: unknown,
  idKeys: string[],
  labelKeys: string[],
): SelectOption | null {
  const record = asRecord(item)
  if (!record || isInactive(record)) return null

  const value = idKeys.map((key) => asString(record[key])).find(Boolean)
  const label = labelKeys.map((key) => asString(record[key])).find(Boolean)

  if (!value || !label) return null
  return { value, label }
}

function uniqueOptions(options: SelectOption[]) {
  const seen = new Set<string>()

  return options.filter((option) => {
    if (seen.has(option.value)) return false
    seen.add(option.value)
    return true
  })
}

async function fetchPagedList(
  path: string,
  extraKeys: string[],
  extraParams?: Record<string, string | number | boolean | undefined>,
) {
  const items: unknown[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await apiClient<unknown>(path, {
      params: { page, limit: PAGE_SIZE, ...extraParams },
    })
    const pageItems = extractList(payload, extraKeys)
    items.push(...pageItems)
    if (pageItems.length < PAGE_SIZE) break
  }

  return items
}

export async function fetchSubjects(): Promise<SelectOption[]> {
  if (useMockApi) return []

  const items = await fetchPagedList('/subjects', ['subjects'])
  return uniqueOptions(
    items
      .map((item) =>
        normalizeOption(
          item,
          ['id', 'subjectId', 'value'],
          ['name', 'subjectName', 'title', 'label'],
        ),
      )
      .filter((option): option is SelectOption => option !== null),
  )
}

export async function fetchTopics(): Promise<SelectOption[]> {
  if (useMockApi) return []

  const items = await fetchPagedList('/topics', ['topics'])
  const options: SelectOption[] = []

  for (const item of items) {
    const option = normalizeOption(
      item,
      ['id', 'topicId', 'value'],
      ['name', 'topicName', 'title', 'label'],
    )
    if (!option) continue

    const record = asRecord(item)
    const linkedSubjectId =
      asString(record?.subjectId) ?? nestedId(record?.subject) ?? asString(record?.subject_id)

    options.push(linkedSubjectId ? { ...option, subjectId: linkedSubjectId } : option)
  }

  return uniqueOptions(options)
}

export async function fetchDifficulties(): Promise<SelectOption[]> {
  if (useMockApi) return []

  const items = await fetchPagedList('/difficulties', ['difficulties'])
  return uniqueOptions(
    items
      .map((item) =>
        normalizeOption(
          item,
          ['id', 'difficultyId', 'value', 'code'],
          ['name', 'title', 'label', 'level', 'code'],
        ),
      )
      .filter((option): option is SelectOption => option !== null),
  )
}

export async function fetchLanguages(): Promise<SelectOption[]> {
  if (useMockApi) {
    return [
      { value: 'english', label: 'English' },
      { value: 'hindi', label: 'Hindi' },
    ]
  }

  const items = await fetchPagedList('/languages', ['languages'])
  return uniqueOptions(
    items
      .map((item) =>
        normalizeOption(item, ['id', 'languageId', 'code', 'value'], ['name', 'title', 'label', 'code']),
      )
      .filter((option): option is SelectOption => option !== null),
  )
}

import { apiClient } from '@/lib/api-client'

export type TestTemplate = {
  id: string
  name: string
  imageKey: string
  htmlKey: string
  ranking: number
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

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return undefined
}

function extractItems(payload: unknown): unknown[] {
  const root = asRecord(payload)
  if (!root) return []

  if (root.success === false) {
    throw new Error(asString(root.message) || 'Unable to fetch templates')
  }

  const nested = asRecord(root.data)

  const candidates = [root.items, nested?.items, root.data, nested?.templates, root.templates]

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

function isInactive(record: Record<string, unknown>) {
  if (record.isActive === false) return true
  const status = asString(record.status)?.toLowerCase()
  return status === 'inactive' || status === 'disabled'
}

function normalizeTemplate(item: unknown): TestTemplate | null {
  const record = asRecord(item)
  if (!record || isInactive(record)) return null

  const id = asString(record.id)
  const name = asString(record.name) ?? asString(record.title) ?? asString(record.label)

  if (!id || !name) return null

  return {
    id,
    name,
    imageKey: asString(record.imageKey) ?? '',
    htmlKey: asString(record.htmlKey) ?? '',
    ranking: asNumber(record.ranking) ?? Number.MAX_SAFE_INTEGER,
  }
}

async function fetchTemplatePage(page: number) {
  const payload = await apiClient<unknown>('/super-admin/templates', {
    params: { page, limit: PAGE_SIZE },
  })

  const items = extractItems(payload)

  return {
    items,
    totalPages: extractTotalPages(payload),
  }
}

export async function fetchTemplates(): Promise<TestTemplate[]> {
  const templates: TestTemplate[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { items, totalPages } = await fetchTemplatePage(page)

    for (const item of items) {
      const template = normalizeTemplate(item)
      if (template) templates.push(template)
    }

    if (totalPages && page >= totalPages) break
    if (items.length < PAGE_SIZE) break
  }

  return templates.sort((left, right) => left.ranking - right.ranking)
}

import { apiClient } from '@/lib/api-client'

export type InstructionOption = {
  value: string
  label: string
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

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload

  const root = asRecord(payload)
  if (!root) return []

  const nested = asRecord(root.data)

  const candidates = [
    root.items,
    root.data,
    root.instructions,
    nested?.items,
    nested?.data,
    nested?.instructions,
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

function normalizeInstruction(item: unknown): InstructionOption | null {
  const record = asRecord(item)
  if (!record || isInactive(record)) return null

  const value =
    asString(record.id) ??
    asString(record.instructionId) ??
    asString(record.value) ??
    asString(record.slug)
  const label =
    asString(record.name) ??
    asString(record.title) ??
    asString(record.label) ??
    asString(record.instructionTitle)

  if (!value || !label) return null

  return { value, label }
}

function uniqueOptions(options: InstructionOption[]) {
  const seen = new Set<string>()

  return options.filter((option) => {
    if (seen.has(option.value)) return false
    seen.add(option.value)
    return true
  })
}

async function fetchInstructionPage(page: number) {
  const payload = await apiClient<unknown>('/instructions', {
    params: { page, limit: PAGE_SIZE },
  })

  return extractList(payload)
}

export async function fetchInstructions(): Promise<InstructionOption[]> {
  const options: InstructionOption[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const pageItems = await fetchInstructionPage(page)
    const normalized = pageItems
      .map(normalizeInstruction)
      .filter((option): option is InstructionOption => option !== null)

    options.push(...normalized)

    if (pageItems.length < PAGE_SIZE) break
  }

  return uniqueOptions(options)
}

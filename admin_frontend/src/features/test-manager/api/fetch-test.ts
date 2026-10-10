import type { CreateTestPayload } from '@/features/test-manager/lib/to-create-test-payload'
import { apiClient } from '@/lib/api-client'

export type TestDetail = CreateTestPayload & {
  id: string
  categoryName?: string
  primaryInstructionName?: string
}

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

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function nestedId(value: unknown) {
  const record = asRecord(value)
  return asString(record?.id) ?? asString(record?.instructionId) ?? asString(record?.categoryId)
}

function nestedName(value: unknown) {
  const record = asRecord(value)
  return asString(record?.name) ?? asString(record?.title) ?? asString(record?.label)
}

function looksLikeTestRecord(record: Record<string, unknown>) {
  return Boolean(
    asString(record.id) ??
      asString(record.testId) ??
      asString(record.primaryInstructionId) ??
      record.primaryInstruction ??
      asString(record.templateId) ??
      record.template,
  )
}

function unwrapTestRecord(payload: unknown): Record<string, unknown> {
  const root = asRecord(payload)
  if (!root) throw new Error('Unable to load test')

  if (root.success === false) {
    throw new Error(asString(root.message) || 'Unable to load test')
  }

  const nested = asRecord(root.data)
  const candidates = [nested, asRecord(nested?.test), asRecord(nested?.data), root]

  for (const candidate of candidates) {
    if (candidate && looksLikeTestRecord(candidate)) {
      return candidate
    }
  }

  throw new Error(asString(root.message) || 'Unable to load test')
}

function normalizeTest(record: Record<string, unknown>): TestDetail {
  const id = asString(record.id) ?? asString(record.testId)

  if (!id) {
    throw new Error('Test response is missing an id')
  }

  return {
    id,
    name: asString(record.name) ?? '',
    description: asString(record.description) ?? '',
    testCode: asString(record.testCode) ?? '',
    categoryId: asString(record.categoryId) || nestedId(record.category) || '',
    categoryName: nestedName(record.category),
    primaryInstructionId:
      asString(record.primaryInstructionId) ||
      nestedId(record.primaryInstruction) ||
      nestedId(record.instruction) ||
      '',
    primaryInstructionName:
      nestedName(record.primaryInstruction) || nestedName(record.instruction),
    durationMinutes: asNumber(record.durationMinutes) ?? 0,
    handicappedDurationMinutes: asNumber(record.handicappedDurationMinutes) ?? 0,
    totalQuestions: asNumber(record.totalQuestions) ?? 0,
    totalMarks: asNumber(record.totalMarks) ?? 0,
    passingMarks: asNumber(record.passingMarks) ?? 0,
    graceMarks: asNumber(record.graceMarks) ?? 0,
    isDraft: asBoolean(record.isDraft, true),
    templateId: asString(record.templateId) ?? nestedId(record.template) ?? '',
    isPublished: asBoolean(record.isPublished, false),
    startDate: asString(record.startDate) ?? '',
    endDate: asString(record.endDate) ?? '',
    startBufferTime: asString(record.startBufferTime) ?? '',
    startTime: asString(record.startTime) ?? '',
    endTime: asString(record.endTime) ?? '',
    isActive: asBoolean(record.isActive, true),
  }
}

export async function fetchTest(testId: string): Promise<TestDetail> {
  const payload = await apiClient<unknown>(`/tests/${encodeURIComponent(testId)}`)
  return normalizeTest(unwrapTestRecord(payload))
}

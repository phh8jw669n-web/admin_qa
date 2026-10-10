import type { CreateTestFormValues } from '@/features/test-manager/schema/step-1-create.schema'
import { emptyCreateTestValues } from '@/features/test-manager/schema/step-1-create.schema'

export type CreateTestPayload = {
  name: string
  description: string
  testCode: string
  categoryId: string
  primaryInstructionId: string
  durationMinutes: number
  handicappedDurationMinutes: number
  totalQuestions: number
  totalMarks: number
  passingMarks: number
  graceMarks: number
  isDraft: boolean
  templateId: string
  isPublished: boolean
  startDate: string
  endDate: string
  startBufferTime: string
  startTime: string
  endTime: string
  isActive: boolean
}

function toDurationTime(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`
  return trimmed
}

function toNumber(value: string) {
  if (value.trim() === '') return 0
  return Number(value)
}

function toInputString(value: unknown) {
  if (value == null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') return value
  return ''
}

function toDateInput(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? ''
}

function toTimeInput(value: string) {
  const match = value.match(/(\d{2}:\d{2})/)
  return match?.[1] ?? ''
}

export function toCreateTestPayload(
  values: CreateTestFormValues,
  flags?: Partial<Pick<CreateTestPayload, 'isDraft' | 'isPublished' | 'isActive'>>,
): CreateTestPayload {
  return {
    name: values.name,
    description: values.description,
    testCode: values.testCode,
    categoryId: values.categoryId,
    primaryInstructionId: values.primaryInstructionId,
    durationMinutes: toNumber(values.durationMinutes),
    handicappedDurationMinutes: toNumber(values.handicappedDurationMinutes),
    totalQuestions: toNumber(values.totalQuestions),
    totalMarks: toNumber(values.totalMarks),
    passingMarks: toNumber(values.passingMarks),
    graceMarks: toNumber(values.graceMarks),
    isDraft: flags?.isDraft ?? true,
    templateId: values.templateId,
    isPublished: flags?.isPublished ?? false,
    startDate: values.startDate,
    endDate: values.endDate,
    startBufferTime: toDurationTime(values.startBufferTime),
    startTime: values.startTime,
    endTime: values.endTime,
    isActive: flags?.isActive ?? true,
  }
}

export function areCreateTestPayloadsEqual(left: CreateTestPayload, right: CreateTestPayload) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function nestedRecordId(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const record = value as Record<string, unknown>
  return toInputString(record.id || record.instructionId || record.categoryId)
}

export function toCreateTestFormValues(
  test: Partial<CreateTestPayload> & {
    primaryInstruction?: unknown
    instruction?: unknown
    category?: unknown
  },
): CreateTestFormValues {
  const startDate = toDateInput(toInputString(test.startDate))
  const endDate = toDateInput(toInputString(test.endDate))
  const startTime =
    toTimeInput(toInputString(test.startTime)) || toTimeInput(toInputString(test.startDate))
  const endTime = toTimeInput(toInputString(test.endTime)) || toTimeInput(toInputString(test.endDate))

  return {
    ...emptyCreateTestValues,
    name: toInputString(test.name),
    description: toInputString(test.description),
    testCode: toInputString(test.testCode),
    categoryId: toInputString(test.categoryId) || nestedRecordId(test.category),
    primaryInstructionId:
      toInputString(test.primaryInstructionId) ||
      nestedRecordId(test.primaryInstruction) ||
      nestedRecordId(test.instruction),
    durationMinutes: toInputString(test.durationMinutes),
    handicappedDurationMinutes: toInputString(test.handicappedDurationMinutes),
    totalQuestions: toInputString(test.totalQuestions),
    totalMarks: toInputString(test.totalMarks),
    passingMarks: toInputString(test.passingMarks),
    graceMarks: toInputString(test.graceMarks),
    templateId: toInputString(test.templateId),
    startDate,
    endDate,
    startTime,
    endTime,
    startBufferTime: toTimeInput(toInputString(test.startBufferTime)) || toInputString(test.startBufferTime),
  }
}

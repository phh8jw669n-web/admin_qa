import { z } from 'zod'

const requiredPositiveDigits = (requiredMessage: string, invalidMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine((value) => /^\d+$/.test(value) && Number(value) > 0, invalidMessage)

const optionalNonNegativeDigits = (invalidMessage: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 0), invalidMessage)

export const HANDICAPPED_MUST_EXCEED_DURATION_MESSAGE = 'Must be more than the actual duration'

export function isHandicappedNotMoreThanDuration(
  handicappedDurationMinutes: string,
  durationMinutes: string,
) {
  if (handicappedDurationMinutes === '') return false
  if (!/^\d+$/.test(handicappedDurationMinutes) || !/^\d+$/.test(durationMinutes)) return false
  return Number(handicappedDurationMinutes) <= Number(durationMinutes)
}

export const createTestSchema = z
  .object({
    name: z.string().trim().min(1, 'Test name is required'),
    description: z.string().trim(),
    testCode: z.string().trim().min(1, 'Test code is required'),
    categoryId: z.string().min(1, 'Category is required'),
    primaryInstructionId: z.string().min(1, 'Test instructions are required'),
    durationMinutes: requiredPositiveDigits(
      'Duration is required',
      'Enter a valid duration in minutes',
    ),
    handicappedDurationMinutes: optionalNonNegativeDigits('Enter a valid duration in minutes'),
    totalQuestions: requiredPositiveDigits(
      'Total questions is required',
      'Enter a valid question count',
    ),
    totalMarks: optionalNonNegativeDigits('Enter a valid marks total').refine(
      (value) => value !== '',
      'Total marks is required',
    ),
    passingMarks: optionalNonNegativeDigits('Enter a valid passing marks value'),
    graceMarks: optionalNonNegativeDigits('Enter a valid grace marks value'),
    templateId: z.string().min(1, 'Select a test template'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    startBufferTime: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (isHandicappedNotMoreThanDuration(data.handicappedDurationMinutes, data.durationMinutes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['handicappedDurationMinutes'],
        message: HANDICAPPED_MUST_EXCEED_DURATION_MESSAGE,
      })
    }

    if (data.passingMarks && data.totalMarks && Number(data.passingMarks) > Number(data.totalMarks)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['passingMarks'],
        message: 'Passing marks cannot exceed total marks',
      })
    }

    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be on or after the start date',
      })
    }

    if (
      data.startDate &&
      data.endDate &&
      data.startDate === data.endDate &&
      data.startTime &&
      data.endTime &&
      data.endTime <= data.startTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must be after the start time',
      })
    }
  })

export type CreateTestFormValues = z.infer<typeof createTestSchema>

export const emptyCreateTestValues: CreateTestFormValues = {
  name: '',
  description: '',
  testCode: '',
  categoryId: '',
  primaryInstructionId: '',
  durationMinutes: '',
  handicappedDurationMinutes: '',
  totalQuestions: '',
  totalMarks: '',
  passingMarks: '',
  graceMarks: '',
  templateId: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  startBufferTime: '',
}

type LegacyCreateTestValues = Partial<CreateTestFormValues> & {
  category?: string
  instructions?: string
  handicappedMinutes?: string
  template?: string
}

export function migrateCreateTestValues(
  existing?: LegacyCreateTestValues,
): Partial<CreateTestFormValues> {
  if (!existing) return {}

  return {
    ...existing,
    categoryId: existing.categoryId || existing.category || '',
    primaryInstructionId: existing.primaryInstructionId || existing.instructions || '',
    handicappedDurationMinutes:
      existing.handicappedDurationMinutes || existing.handicappedMinutes || '',
    templateId: existing.templateId || existing.template || '',
  }
}

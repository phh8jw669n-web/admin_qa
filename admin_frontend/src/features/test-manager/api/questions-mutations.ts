import { useMutation, useQueryClient } from '@tanstack/react-query'

import { testQueryKey } from '@/features/test-manager/api/use-test'
import { testsQueryKey } from '@/features/test-manager/api/use-tests-list'
import {
  toCreateQuestionPayload,
  toNestedQuestionSource,
  toUpdateQuestionPayload,
  type CreateQuestionPayload,
  type UpdateQuestionPayload,
} from '@/features/test-manager/lib/to-question-payload'
import {
  isComprehensionQuestionType,
  type SavedQuestion,
} from '@/features/test-manager/schema/step-3-questions.schema'
import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'

export type SaveQuestionResult = {
  id: string
  languageContentIds: Record<string, string>
}

export type SaveWizardQuestionResult = SaveQuestionResult & {
  comprehensionQuestions: Array<{
    id: string
    serverId: string
    languageContentIds: Record<string, string>
  }>
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function extractList(payload: unknown): unknown[] {
  const root = asRecord(payload)
  if (!root) return []

  const nested = asRecord(root.data)
  const question = asRecord(nested?.question)
  const candidates = [
    root.questionData,
    nested?.questionData,
    question?.questionData,
    nested?.items,
    root.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

function extractQuestionId(payload: unknown): string | undefined {
  const root = asRecord(payload)
  if (!root) return undefined

  const nested = asRecord(root.data)
  const question = asRecord(nested?.question) ?? asRecord(root.question)

  return (
    asString(question?.id) ??
    asString(nested?.id) ??
    asString(root.id) ??
    asString(question?.questionId) ??
    asString(nested?.questionId) ??
    asString(root.questionId)
  )
}

function extractLanguageContentIds(
  payload: unknown,
  languageIds: string[],
): Record<string, string> {
  const ids: Record<string, string> = {}

  extractList(payload).forEach((item, index) => {
    const record = asRecord(item)
    if (!record) return
    const languageId = asString(record.languageId) ?? languageIds[index]
    const id =
      asString(record.id) ??
      asString(record.questionDataId) ??
      asString(record.contentId)
    if (languageId && id) ids[languageId] = id
  })

  return ids
}

function assertSuccess(payload: unknown, fallbackMessage: string) {
  const root = asRecord(payload)
  if (root?.success === false) {
    throw new Error(asString(root.message) || fallbackMessage)
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mockResult(
  languageIds: string[],
  existingId?: string,
  existingContentIds: Record<string, string> = {},
): SaveQuestionResult {
  return {
    id: existingId || crypto.randomUUID(),
    languageContentIds: Object.fromEntries(
      languageIds.map((languageId) => [
        languageId,
        existingContentIds[languageId] || crypto.randomUUID(),
      ]),
    ),
  }
}

function languageIdsFromPayload(
  payload: CreateQuestionPayload | UpdateQuestionPayload,
) {
  return payload.questionData.map((item) => item.languageId)
}

export async function createQuestion(payload: CreateQuestionPayload): Promise<SaveQuestionResult> {
  const languageIds = languageIdsFromPayload(payload)

  if (useMockApi) {
    await delay(400)
    return mockResult(languageIds)
  }

  const response = await apiClient<unknown>('/questions', {
    method: 'POST',
    body: payload,
  })

  assertSuccess(response, 'Unable to save question')
  const id = extractQuestionId(response)
  if (!id) throw new Error('Unable to save question')

  return {
    id,
    languageContentIds: extractLanguageContentIds(response, languageIds),
  }
}

export async function updateQuestion({
  id,
  payload,
}: {
  id: string
  payload: UpdateQuestionPayload
}): Promise<SaveQuestionResult> {
  const languageIds = languageIdsFromPayload(payload)
  const existingContentIds = Object.fromEntries(
    payload.questionData
      .filter((item) => item.id)
      .map((item) => [item.languageId, item.id as string]),
  )

  if (useMockApi) {
    await delay(400)
    return mockResult(languageIds, id, existingContentIds)
  }

  const response = await apiClient<unknown>(`/questions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  })

  assertSuccess(response, 'Unable to update question')

  return {
    id,
    languageContentIds: {
      ...existingContentIds,
      ...extractLanguageContentIds(response, languageIds),
    },
  }
}

export async function saveQuestion({
  id,
  testId,
  value,
}: {
  id?: string
  testId: string
  value: SavedQuestion
}): Promise<SaveQuestionResult> {
  if (id) {
    return updateQuestion({ id, payload: toUpdateQuestionPayload(value) })
  }

  return createQuestion(toCreateQuestionPayload(testId, value))
}

export async function saveWizardQuestion({
  testId,
  question,
}: {
  testId: string
  question: SavedQuestion
}): Promise<SaveWizardQuestionResult> {
  const main = await saveQuestion({
    id: question.serverId,
    testId,
    value: question,
  })

  const comprehensionQuestions: SaveWizardQuestionResult['comprehensionQuestions'] = []

  if (isComprehensionQuestionType(question.questionType)) {
    for (const nested of question.comprehensionQuestions) {
      const saved = await saveQuestion({
        id: nested.serverId,
        testId,
        value: {
          ...toNestedQuestionSource(question, nested),
          id: nested.id,
          saved: Boolean(nested.serverId),
          serverId: nested.serverId,
        },
      })

      comprehensionQuestions.push({
        id: nested.id,
        serverId: saved.id,
        languageContentIds: saved.languageContentIds,
      })
    }
  }

  return { ...main, comprehensionQuestions }
}

export function useSaveQuestion(testId?: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveWizardQuestion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testsQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['questions'] })
      if (testId) {
        void queryClient.invalidateQueries({ queryKey: testQueryKey(testId) })
      }
    },
  })
}

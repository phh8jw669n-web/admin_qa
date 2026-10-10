import { choiceOptionApiId } from '@/features/test-manager/lib/to-question-payload'
import {
  isChoiceQuestionType,
  isComprehensionQuestionType,
  isFillBlankQuestionType,
  normalizeQuestion,
  normalizeQuestionType,
  type QuestionChoiceOption,
  type QuestionTranslation,
  type SavedQuestion,
} from '@/features/test-manager/schema/step-3-questions.schema'
import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'

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

function toInputString(value: unknown) {
  if (value == null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') return value
  return ''
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload

  const root = asRecord(payload)
  if (!root) return []

  if (root.success === false) {
    throw new Error(asString(root.message) || 'Unable to load questions')
  }

  const nested = asRecord(root.data)
  const candidates = [
    root.items,
    root.questions,
    nested?.items,
    nested?.questions,
    nested?.data,
    root.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => asString(item)).filter((item): item is string => Boolean(item))
}

function toTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter((item): item is string => Boolean(item))
  }

  const text = asString(value)
  if (!text) return []
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toChoiceOptions(optionsValue: unknown): QuestionChoiceOption[] {
  const record = asRecord(optionsValue)
  const items = Array.isArray(record?.options) ? record.options : []
  const correct = new Set(asStringArray(record?.correctOptions))

  return items
    .map((item, index) => {
      const option = asRecord(item)
      const id = asString(option?.id) || choiceOptionApiId(index)
      const text = toInputString(option?.text)
      return {
        id,
        text,
        isCorrect: correct.has(id),
        documentName: '',
      }
    })
    .filter((option) => option.id)
}

function toAnswerType(value: unknown) {
  const type = asString(value)?.toLowerCase()
  if (type === 'numbers' || type === 'numeric') return 'numeric'
  return 'alphanumeric'
}

function languageContentFromRecord(
  record: Record<string, unknown>,
  questionType: string,
): Omit<QuestionTranslation, 'comprehensionQuestions'> & {
  difficultyLevel: string
  videoSolutionUrl: string
  tags: string[]
  optionMarks: string
  rangeFrom: string
  rangeTo: string
  rightMarks: string
  negativeMarks: string
  answerType: string
  choiceOptions: QuestionChoiceOption[]
} {
  const options = record.options
  const optionsRecord = asRecord(options)
  const isFill = isFillBlankQuestionType(questionType)
  const isChoice = isChoiceQuestionType(questionType)
  const isComprehension = isComprehensionQuestionType(questionType)
  const questionText = toInputString(record.questionText)

  return {
    languageId: asString(record.languageId) ?? '',
    body: isComprehension ? '' : questionText,
    explanation: toInputString(record.explanation),
    fillBlankAnswer: isFill ? toInputString(optionsRecord?.answer) : '',
    comprehensionSummary: isComprehension ? questionText : '',
    choiceOptions: isChoice ? toChoiceOptions(options) : [],
    difficultyLevel: asString(record.difficultyId) ?? '',
    videoSolutionUrl: toInputString(record.solutionUrl),
    tags: toTags(record.tags),
    optionMarks: toInputString(record.optionMarks),
    rangeFrom: toInputString(record.rangeFrom),
    rangeTo: toInputString(record.rangeTo),
    rightMarks: toInputString(record.rightMarks),
    negativeMarks: toInputString(record.negativeMarks),
    answerType: isFill ? toAnswerType(optionsRecord?.answerType) : 'alphanumeric',
  }
}

type QuestionBundle = {
  parent: Record<string, unknown>
  questionData: Record<string, unknown>[]
}

function toQuestionBundle(item: unknown): QuestionBundle | null {
  const record = asRecord(item)
  if (!record) return null

  const nestedQuestion = asRecord(record.question)
  const parent = nestedQuestion ?? record
  const nestedData = record.questionData ?? nestedQuestion?.questionData

  if (Array.isArray(nestedData)) {
    return {
      parent,
      questionData: nestedData.map((entry) => asRecord(entry)).filter((entry): entry is Record<string, unknown> => Boolean(entry)),
    }
  }

  if (asString(record.languageId) && asString(record.questionId)) {
    return {
      parent,
      questionData: [record],
    }
  }

  if (asString(parent.id) || asString(parent.questionId)) {
    return { parent, questionData: asString(record.languageId) ? [record] : [] }
  }

  return null
}

function toSavedQuestion(bundle: QuestionBundle): SavedQuestion | null {
  const questionType = normalizeQuestionType(
    asString(bundle.parent.questionType) ?? asString(bundle.questionData[0]?.questionType) ?? '',
  )
  if (!questionType || bundle.questionData.length === 0) return null

  const contents = bundle.questionData
    .map((record) => languageContentFromRecord(record, questionType))
    .filter((item) => item.languageId)

  if (contents.length === 0) return null

  const primary = contents[0]
  const languageIds = [...new Set(contents.map((item) => item.languageId))]
  const languageContentIds = Object.fromEntries(
    bundle.questionData
      .map((record) => [asString(record.languageId), asString(record.id)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1])),
  )

  const translations: QuestionTranslation[] = contents.slice(1).map((item) => ({
    languageId: item.languageId,
    body: item.body,
    explanation: item.explanation,
    fillBlankAnswer: item.fillBlankAnswer,
    comprehensionSummary: item.comprehensionSummary,
    choiceOptions: item.choiceOptions.map((option) => ({ id: option.id, text: option.text })),
    comprehensionQuestions: [],
  }))

  return normalizeQuestion({
    id: crypto.randomUUID(),
    serverId:
      asString(bundle.parent.id) ??
      asString(bundle.parent.questionId) ??
      asString(bundle.questionData[0]?.questionId),
    saved: true,
    subjectId: asString(bundle.parent.subjectId) ?? '',
    topicId: asString(bundle.parent.topicId) ?? '',
    questionType,
    language: primary.languageId,
    languageIds,
    languageContentIds,
    body: primary.body,
    explanation: primary.explanation,
    fillBlankAnswer: primary.fillBlankAnswer,
    comprehensionSummary: primary.comprehensionSummary,
    choiceOptions: primary.choiceOptions,
    tags: primary.tags,
    optionMarks: primary.optionMarks,
    rangeFrom: primary.rangeFrom,
    rangeTo: primary.rangeTo,
    rightMarks: primary.rightMarks,
    negativeMarks: primary.negativeMarks,
    answerType: primary.answerType,
    difficultyLevel: primary.difficultyLevel,
    videoSolutionUrl: primary.videoSolutionUrl,
    translations,
    comprehensionQuestions: [],
  })
}

export type QuestionListItem = {
  id: string
  testId: string
  subjectId: string
  topicId: string
  questionType: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

function toListItem(item: unknown): QuestionListItem | null {
  const record = asRecord(item)
  if (!record) return null
  const parent = asRecord(record.question) ?? record
  const id = asString(parent.id) ?? asString(parent.questionId)
  if (!id) return null

  return {
    id,
    testId: asString(parent.testId) ?? '',
    subjectId: asString(parent.subjectId) ?? '',
    topicId: asString(parent.topicId) ?? '',
    questionType: normalizeQuestionType(asString(parent.questionType) ?? ''),
    isActive: parent.isActive !== false,
    createdAt: asString(parent.createdAt),
    updatedAt: asString(parent.updatedAt),
  }
}

function unwrapQuestionDetail(payload: unknown): QuestionBundle {
  const root = asRecord(payload)
  if (!root) throw new Error('Unable to load question')

  if (root.success === false) {
    throw new Error(asString(root.message) || 'Unable to load question')
  }

  const data = asRecord(root.data) ?? root
  const bundle = toQuestionBundle({
    ...data,
    question: asRecord(data.question) ?? data,
    questionData: data.questionData ?? asRecord(data.question)?.questionData,
  })

  if (!bundle || bundle.questionData.length === 0) {
    throw new Error(asString(root.message) || 'Unable to load question')
  }

  return bundle
}

export async function fetchQuestionsByTestId(testId: string): Promise<QuestionListItem[]> {
  if (useMockApi) return []

  const items: unknown[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await apiClient<unknown>('/questions', {
      params: { page, limit: PAGE_SIZE, testId },
    })
    const pageItems = extractList(payload)
    items.push(...pageItems)
    if (pageItems.length < PAGE_SIZE) break
  }

  return items.map(toListItem).filter((item): item is QuestionListItem => Boolean(item))
}

export async function fetchQuestionById(id: string): Promise<SavedQuestion> {
  if (useMockApi) {
    throw new Error('Question details are unavailable in mock mode')
  }

  const payload = await apiClient<unknown>(`/questions/${encodeURIComponent(id)}`)
  const question = toSavedQuestion(unwrapQuestionDetail(payload))
  if (!question) throw new Error('Unable to load question')
  return question
}

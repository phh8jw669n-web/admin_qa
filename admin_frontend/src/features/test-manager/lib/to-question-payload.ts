import {
  hasEditorText,
  isChoiceQuestionType,
  isComprehensionQuestionType,
  isFillBlankQuestionType,
  normalizeQuestionType,
  type NestedQuestionData,
  type NestedQuestionTranslation,
  type QuestionChoiceOption,
  type QuestionsData,
  type QuestionTranslation,
} from '@/features/test-manager/schema/step-3-questions.schema'

export type QuestionChoiceItemPayload = {
  id: string
  text: string
}

export type ChoiceOptionsPayload = {
  options: QuestionChoiceItemPayload[]
  correctOptions: string[]
}

export type FillBlankOptionsPayload = {
  answerType: 'alphanumeric' | 'numbers'
  answer: string
}

export type QuestionDataPayload = {
  id?: string
  languageId: string
  difficultyId: string
  questionType: string
  questionText: string
  options: ChoiceOptionsPayload | FillBlankOptionsPayload | null
  explanation?: string
  solutionUrl?: string
  tags?: string
  optionMarks?: string
  rangeFrom?: number
  rangeTo?: number
  rightMarks?: number
  negativeMarks?: number
}

export type CreateQuestionPayload = {
  testId: string
  subjectId: string
  topicId: string
  questionType: string
  isActive: boolean
  questionData: QuestionDataPayload[]
}

export type UpdateQuestionPayload = {
  subjectId: string
  topicId: string
  questionType: string
  isActive: boolean
  questionData: QuestionDataPayload[]
}

const TAGS_MAX_LENGTH = 200

export function choiceOptionApiId(index: number) {
  return String.fromCharCode(97 + index)
}

function toNumber(value: string) {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function languageIdsFor(value: QuestionsData) {
  const ids = value.languageIds.length > 0 ? value.languageIds : value.language ? [value.language] : []
  return [...new Set(ids.filter(Boolean))]
}

function toAnswerType(value: string): 'alphanumeric' | 'numbers' {
  return value === 'numeric' || value === 'numbers' ? 'numbers' : 'alphanumeric'
}

function toChoiceOptionsPayload(
  options: QuestionChoiceOption[],
  translatedTexts?: Array<{ id: string; text: string }>,
): ChoiceOptionsPayload {
  const texts = new Map((translatedTexts ?? []).map((option) => [option.id, option.text]))
  const items: QuestionChoiceItemPayload[] = []
  const correctOptions: string[] = []

  options.forEach((option, index) => {
    if (!hasEditorText(option.text) && !option.isCorrect) return
    const id = choiceOptionApiId(index)
    items.push({
      id,
      text: texts.get(option.id) ?? option.text,
    })
    if (option.isCorrect) correctOptions.push(id)
  })

  return { options: items, correctOptions }
}

function toQuestionOptions(
  value: QuestionsData,
  translation?: QuestionTranslation | NestedQuestionTranslation,
): ChoiceOptionsPayload | FillBlankOptionsPayload | null {
  if (isComprehensionQuestionType(value.questionType)) return null

  if (isChoiceQuestionType(value.questionType)) {
    return toChoiceOptionsPayload(value.choiceOptions, translation?.choiceOptions)
  }

  if (isFillBlankQuestionType(value.questionType)) {
    return {
      answerType: toAnswerType(value.answerType),
      answer: (translation?.fillBlankAnswer ?? value.fillBlankAnswer).trim(),
    }
  }

  return null
}

function questionTextFor(value: QuestionsData, translation?: QuestionTranslation) {
  if (isComprehensionQuestionType(value.questionType)) {
    return translation?.comprehensionSummary ?? value.comprehensionSummary
  }

  return translation?.body ?? value.body
}

function explanationFor(value: QuestionsData, translation?: QuestionTranslation) {
  if (isComprehensionQuestionType(value.questionType)) {
    return translation ? undefined : value.explanation
  }

  return translation?.explanation ?? value.explanation
}

function toTags(value: QuestionsData) {
  const tags = value.tags.join(',').trim()
  if (!tags) return undefined
  return tags.slice(0, TAGS_MAX_LENGTH)
}

function withOptionalStrings(entry: QuestionDataPayload, extras: {
  explanation?: string
  solutionUrl?: string
  tags?: string
  optionMarks?: string
}) {
  if (extras.explanation && hasEditorText(extras.explanation)) {
    entry.explanation = extras.explanation
  }
  if (extras.solutionUrl?.trim()) entry.solutionUrl = extras.solutionUrl.trim()
  if (extras.tags) entry.tags = extras.tags
  if (extras.optionMarks?.trim()) entry.optionMarks = extras.optionMarks.trim()
}

function withOptionalNumbers(entry: QuestionDataPayload, value: QuestionsData) {
  const rangeFrom = toNumber(value.rangeFrom)
  const rangeTo = toNumber(value.rangeTo)
  const rightMarks = toNumber(value.rightMarks)
  const negativeMarks = toNumber(value.negativeMarks)

  if (rangeFrom != null) entry.rangeFrom = rangeFrom
  if (rangeTo != null) entry.rangeTo = rangeTo
  if (rightMarks != null) entry.rightMarks = rightMarks
  if (negativeMarks != null) entry.negativeMarks = negativeMarks
}

function toQuestionData(
  value: QuestionsData,
  includeContentIds: boolean,
): QuestionDataPayload[] {
  const questionType = normalizeQuestionType(value.questionType)
  const tags = toTags(value)
  const contentIds = value.languageContentIds ?? {}

  return languageIdsFor(value).map((languageId) => {
    const isPrimary = languageId === value.language
    const translation = isPrimary
      ? undefined
      : value.translations.find((item) => item.languageId === languageId)
    const entry: QuestionDataPayload = {
      languageId,
      difficultyId: value.difficultyLevel,
      questionType,
      questionText: questionTextFor(value, translation),
      options: toQuestionOptions(value, translation),
    }

    if (includeContentIds && contentIds[languageId]) {
      entry.id = contentIds[languageId]
    }

    withOptionalStrings(entry, {
      explanation: explanationFor(value, translation),
      solutionUrl: value.videoSolutionUrl,
      tags,
      optionMarks: value.optionMarks,
    })
    withOptionalNumbers(entry, value)

    return entry
  })
}

export function toCreateQuestionPayload(
  testId: string,
  value: QuestionsData,
): CreateQuestionPayload {
  return {
    testId,
    subjectId: value.subjectId,
    topicId: value.topicId,
    questionType: normalizeQuestionType(value.questionType),
    isActive: true,
    questionData: toQuestionData(value, false),
  }
}

export function toUpdateQuestionPayload(value: QuestionsData): UpdateQuestionPayload {
  return {
    subjectId: value.subjectId,
    topicId: value.topicId,
    questionType: normalizeQuestionType(value.questionType),
    isActive: true,
    questionData: toQuestionData(value, true),
  }
}

export function toNestedQuestionSource(
  parent: QuestionsData,
  nested: NestedQuestionData,
): QuestionsData {
  return {
    ...nested,
    subjectId: parent.subjectId,
    topicId: parent.topicId,
    language: parent.language,
    languageIds: parent.languageIds,
    difficultyLevel: nested.difficultyLevel || parent.difficultyLevel,
    videoSolutionUrl: nested.videoSolutionUrl || parent.videoSolutionUrl,
    tags: nested.tags.length > 0 ? nested.tags : parent.tags,
    translations: parent.translations.map((translation) => {
      const nestedTranslation = translation.comprehensionQuestions.find(
        (question) => question.id === nested.id,
      )

      return {
        languageId: translation.languageId,
        body: nestedTranslation?.body ?? '',
        explanation: nestedTranslation?.explanation ?? '',
        fillBlankAnswer: nestedTranslation?.fillBlankAnswer ?? '',
        choiceOptions: nestedTranslation?.choiceOptions ?? [],
        comprehensionSummary: '',
        comprehensionQuestions: [],
      }
    }),
  }
}

import { MIN_CHOICE_OPTIONS } from '@/features/test-manager/constants/step-3-questions'

export type QuestionChoiceOption = {
  id: string
  text: string
  isCorrect: boolean
  documentName: string
}

export type QuestionTranslationOption = {
  id: string
  text: string
}

export type NestedQuestionTranslation = {
  id: string
  body: string
  explanation: string
  fillBlankAnswer: string
  choiceOptions: QuestionTranslationOption[]
}

export type QuestionTranslation = {
  languageId: string
  body: string
  explanation: string
  fillBlankAnswer: string
  comprehensionSummary: string
  choiceOptions: QuestionTranslationOption[]
  comprehensionQuestions: NestedQuestionTranslation[]
}

export type QuestionsData = {
  subjectId: string
  topicId: string
  questionType: string
  language: string
  languageIds: string[]
  body: string
  choiceOptions: QuestionChoiceOption[]
  useTextEditor: boolean
  useDocumentUpload: boolean
  explanation: string
  videoSolutionUrl: string
  tags: string[]
  rightMarks: string
  negativeMarks: string
  difficultyLevel: string
  optionMarks: string
  answerType: string
  fillBlankAnswer: string
  fillBlankDocumentName: string
  rangeFrom: string
  rangeTo: string
  comprehensionSummary: string
  comprehensionQuestions: NestedQuestionData[]
  translations: QuestionTranslation[]
  languageContentIds: Record<string, string>
}

export type NestedQuestionData = QuestionsData & { id: string; serverId?: string }

export type SavedQuestion = NestedQuestionData & { saved: boolean }

export type QuestionsStepData = {
  items: SavedQuestion[]
  currentIndex: number
}

export function createChoiceOption(): QuestionChoiceOption {
  return {
    id: crypto.randomUUID(),
    text: '',
    isCorrect: false,
    documentName: '',
  }
}

export function createDefaultChoiceOptions(): QuestionChoiceOption[] {
  return Array.from({ length: 4 }, () => createChoiceOption())
}

export const emptyQuestionsData: QuestionsData = {
  subjectId: '',
  topicId: '',
  questionType: '',
  language: '',
  languageIds: [],
  body: '',
  choiceOptions: [],
  useTextEditor: false,
  useDocumentUpload: false,
  explanation: '',
  videoSolutionUrl: '',
  tags: [],
  rightMarks: '',
  negativeMarks: '',
  difficultyLevel: '',
  optionMarks: '',
  answerType: 'alphanumeric',
  fillBlankAnswer: '',
  fillBlankDocumentName: '',
  rangeFrom: '',
  rangeTo: '',
  comprehensionSummary: '',
  comprehensionQuestions: [],
  translations: [],
  languageContentIds: {},
}

export function questionApiCount(value: QuestionsData) {
  if (isComprehensionQuestionType(value.questionType)) {
    return 1 + value.comprehensionQuestions.length
  }

  return 1
}

export function canShowQuestionEditor(value: QuestionsData) {
  return Boolean(value.subjectId && value.topicId && value.questionType)
}

export function isChoiceQuestionType(type: string) {
  return type === 'single_choice' || type === 'multiple_choice'
}

export function isFillBlankQuestionType(type: string) {
  return type === 'fill_in_the_blanks' || type === 'fill_blank'
}

export function isComprehensionQuestionType(type: string) {
  return type === 'comprehension'
}

export function normalizeQuestionType(type: string) {
  if (type === 'fill_blank') return 'fill_in_the_blanks'
  return type
}

export function isEnglishLanguage(value: string, label = '') {
  const text = `${label} ${value}`.trim().toLowerCase()
  return text === 'en' || text.startsWith('en-') || /\benglish\b/.test(text)
}

export function findEnglishLanguage(
  languageOptions: Array<{ value: string; label: string }>,
) {
  return languageOptions.find((option) => isEnglishLanguage(option.value, option.label))
}

export function sortEnglishFirst<T extends { value: string; label: string }>(options: T[]) {
  return [...options].sort((left, right) => {
    const leftEnglish = isEnglishLanguage(left.value, left.label)
    const rightEnglish = isEnglishLanguage(right.value, right.label)
    if (leftEnglish === rightEnglish) return 0
    return leftEnglish ? -1 : 1
  })
}

export function ensureEnglishSelected(
  languageIds: string[],
  languageOptions: Array<{ value: string; label: string }>,
) {
  const english = findEnglishLanguage(languageOptions)
  const uniqueIds = languageIds.filter(Boolean).filter((id, index, ids) => ids.indexOf(id) === index)

  if (!english) {
    return {
      languageIds: uniqueIds,
      language: uniqueIds[0] ?? '',
    }
  }

  return {
    languageIds: [english.value, ...uniqueIds.filter((id) => id !== english.value)],
    language: english.value,
  }
}

export function snapshotQuestionTranslation(
  languageId: string,
  source: QuestionsData,
): QuestionTranslation {
  return {
    languageId,
    body: source.body,
    explanation: source.explanation,
    fillBlankAnswer: source.fillBlankAnswer,
    comprehensionSummary: source.comprehensionSummary,
    choiceOptions: source.choiceOptions.map((option) => ({ id: option.id, text: option.text })),
    comprehensionQuestions: source.comprehensionQuestions.map((question) => ({
      id: question.id,
      body: question.body,
      explanation: question.explanation,
      fillBlankAnswer: question.fillBlankAnswer,
      choiceOptions: question.choiceOptions.map((option) => ({ id: option.id, text: option.text })),
    })),
  }
}

export function applyPrimaryLanguage(
  value: SavedQuestion,
  languageIds: string[],
  primaryLanguageId: string,
): SavedQuestion {
  const nextIds = languageIds.filter(Boolean)
  if (!primaryLanguageId || value.language === primaryLanguageId) {
    const next = { ...value, language: primaryLanguageId || value.language, languageIds: nextIds }
    return { ...next, translations: syncQuestionTranslations(next) }
  }

  const incoming = value.translations.find((item) => item.languageId === primaryLanguageId)
  if (!incoming) {
    const next = { ...value, language: primaryLanguageId, languageIds: nextIds }
    return { ...next, translations: syncQuestionTranslations(next) }
  }

  const next: SavedQuestion = {
    ...value,
    language: primaryLanguageId,
    languageIds: nextIds,
    body: incoming.body,
    explanation: incoming.explanation,
    fillBlankAnswer: incoming.fillBlankAnswer,
    comprehensionSummary: incoming.comprehensionSummary,
    choiceOptions: value.choiceOptions.map((option) => ({
      ...option,
      text: incoming.choiceOptions.find((item) => item.id === option.id)?.text ?? option.text,
    })),
    translations: [
      snapshotQuestionTranslation(value.language, value),
      ...value.translations.filter((item) => item.languageId !== primaryLanguageId),
    ],
  }

  return { ...next, translations: syncQuestionTranslations(next) }
}

export function emptyQuestionTranslation(
  languageId: string,
  source: QuestionsData,
): QuestionTranslation {
  return {
    languageId,
    body: '',
    explanation: '',
    fillBlankAnswer: '',
    comprehensionSummary: '',
    choiceOptions: source.choiceOptions.map((option) => ({ id: option.id, text: '' })),
    comprehensionQuestions: source.comprehensionQuestions.map((question) => ({
      id: question.id,
      body: '',
      explanation: '',
      fillBlankAnswer: '',
      choiceOptions: question.choiceOptions.map((option) => ({ id: option.id, text: '' })),
    })),
  }
}

function syncChoiceTranslationOptions(
  source: QuestionChoiceOption[],
  current: QuestionTranslationOption[] = [],
) {
  const texts = new Map(current.map((option) => [option.id, option.text]))
  return source.map((option) => ({ id: option.id, text: texts.get(option.id) ?? '' }))
}

export function syncQuestionTranslations(value: QuestionsData): QuestionTranslation[] {
  const extraLanguageIds = value.languageIds.filter((id) => id && id !== value.language)

  return extraLanguageIds.map((languageId) => {
    const current =
      value.translations.find((translation) => translation.languageId === languageId) ??
      emptyQuestionTranslation(languageId, value)
    const nestedById = new Map(
      current.comprehensionQuestions.map((question) => [question.id, question]),
    )

    return {
      ...current,
      languageId,
      choiceOptions: syncChoiceTranslationOptions(value.choiceOptions, current.choiceOptions),
      comprehensionQuestions: value.comprehensionQuestions.map((question) => {
        const nested = nestedById.get(question.id)
        return {
          id: question.id,
          body: nested?.body ?? '',
          explanation: nested?.explanation ?? '',
          fillBlankAnswer: nested?.fillBlankAnswer ?? '',
          choiceOptions: syncChoiceTranslationOptions(
            question.choiceOptions,
            nested?.choiceOptions,
          ),
        }
      }),
    }
  })
}

export function shouldShowLanguageTabs(
  languageIds: string[],
  languageOptions: Array<{ value: string; label: string }>,
) {
  const selected = sortEnglishFirst(
    languageOptions.filter((option) => languageIds.includes(option.value)),
  )
  return selected.length > 1 && Boolean(findEnglishLanguage(selected))
}

export function resolvePrimaryLanguageId(
  languageIds: string[],
  languageOptions: Array<{ value: string; label: string }>,
) {
  return ensureEnglishSelected(languageIds, languageOptions).language
}

export function createNestedQuestion(
  questionType: string,
  parent?: Pick<
    QuestionsData,
    'subjectId' | 'topicId' | 'language' | 'languageIds' | 'difficultyLevel'
  >,
): NestedQuestionData {
  const seeded = withChoiceQuestionDefaults(
    {
      ...emptyQuestionsData,
      subjectId: parent?.subjectId ?? '',
      topicId: parent?.topicId ?? '',
      language: parent?.language ?? '',
      languageIds: parent?.languageIds ?? [],
      difficultyLevel: parent?.difficultyLevel ?? '',
      questionType,
      comprehensionQuestions: [],
      translations: [],
    },
    questionType,
  )

  return { ...seeded, id: crypto.randomUUID() }
}

export function choiceOptionLabel(index: number) {
  return String.fromCharCode(65 + index)
}

function coerceSingleCorrect(options: QuestionChoiceOption[]) {
  const firstCorrectId = options.find((option) => option.isCorrect)?.id
  if (!firstCorrectId) return options
  return options.map((option) => ({ ...option, isCorrect: option.id === firstCorrectId }))
}

export function withChoiceQuestionDefaults(
  value: QuestionsData,
  questionType = value.questionType,
): QuestionsData {
  if (!isChoiceQuestionType(questionType)) {
    return { ...value, questionType }
  }

  const choiceOptions =
    value.choiceOptions.length >= MIN_CHOICE_OPTIONS
      ? value.choiceOptions
      : createDefaultChoiceOptions()

  return {
    ...value,
    questionType,
    choiceOptions:
      questionType === 'single_choice' ? coerceSingleCorrect(choiceOptions) : choiceOptions,
  }
}

export function hasEditorText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim().length > 0
}

export function createDraftQuestion(
  parent?: Pick<
    QuestionsData,
    'subjectId' | 'topicId' | 'language' | 'languageIds' | 'questionType'
  >,
): SavedQuestion {
  const seeded = withChoiceQuestionDefaults({
    ...emptyQuestionsData,
    subjectId: parent?.subjectId ?? '',
    topicId: parent?.topicId ?? '',
    language: parent?.language ?? '',
    languageIds: parent?.languageIds ?? [],
    questionType: parent?.questionType ?? '',
    comprehensionQuestions: [],
  })
  const withLanguages = {
    ...seeded,
    translations: syncQuestionTranslations(seeded),
  }

  return { ...withLanguages, id: crypto.randomUUID(), saved: false }
}

export function normalizeQuestion(
  value?: Partial<SavedQuestion> | Partial<QuestionsData>,
): SavedQuestion {
  const candidate = value as Partial<SavedQuestion> | undefined
  const languageIds =
    candidate?.languageIds && candidate.languageIds.length > 0
      ? candidate.languageIds
      : candidate?.language
        ? [candidate.language]
        : []

  const normalized: SavedQuestion = {
    ...emptyQuestionsData,
    ...candidate,
    id: candidate?.id || crypto.randomUUID(),
    saved: Boolean(candidate?.saved),
    serverId: candidate?.serverId,
    questionType: normalizeQuestionType(candidate?.questionType ?? ''),
    languageIds,
    choiceOptions: candidate?.choiceOptions ?? emptyQuestionsData.choiceOptions,
    tags: candidate?.tags ?? emptyQuestionsData.tags,
    comprehensionQuestions: (
      candidate?.comprehensionQuestions ?? emptyQuestionsData.comprehensionQuestions
    ).map((question) => ({
      ...question,
      questionType: normalizeQuestionType(question.questionType),
      languageContentIds: question.languageContentIds ?? {},
    })),
    translations: candidate?.translations ?? emptyQuestionsData.translations,
    languageContentIds: candidate?.languageContentIds ?? emptyQuestionsData.languageContentIds,
  }

  return { ...normalized, translations: syncQuestionTranslations(normalized) }
}

function isQuestionsStepData(value: unknown): value is QuestionsStepData {
  return Boolean(
    value && typeof value === 'object' && Array.isArray((value as QuestionsStepData).items),
  )
}

export function normalizeQuestionsStepData(
  value?: QuestionsStepData | QuestionsData | SavedQuestion,
  fallbackDraft?: SavedQuestion,
): QuestionsStepData {
  if (isQuestionsStepData(value)) {
    const items =
      value.items.length > 0
        ? value.items.map(normalizeQuestion)
        : [fallbackDraft ?? createDraftQuestion()]
    const currentIndex = Math.min(Math.max(value.currentIndex || 0, 0), items.length - 1)
    return { items, currentIndex }
  }

  if (value && typeof value === 'object' && 'questionType' in value) {
    return {
      items: [normalizeQuestion({ ...value, id: fallbackDraft?.id })],
      currentIndex: 0,
    }
  }

  return { items: [fallbackDraft ?? createDraftQuestion()], currentIndex: 0 }
}

export function getQuestionSaveError(value: QuestionsData, nested = false): string | null {
  if (!nested && (!value.subjectId || !value.topicId || !value.questionType)) {
    return 'Select subject, topic and question type'
  }

  if (!nested && (!value.languageIds.length && !value.language)) {
    return 'Select a language'
  }

  if (!value.questionType) {
    return 'Select a question type'
  }

  if (!nested && !value.difficultyLevel) {
    return 'Select a difficulty'
  }

  const tags = value.tags.join(',')
  if (tags.length > 200) {
    return 'Tags must be 200 characters or fewer'
  }

  if (isComprehensionQuestionType(value.questionType)) {
    if (!hasEditorText(value.comprehensionSummary)) {
      return 'Add a comprehension summary'
    }
    if (value.comprehensionQuestions.length === 0) {
      return 'Add at least one question for this passage'
    }

    for (let index = 0; index < value.comprehensionQuestions.length; index += 1) {
      const nestedError = getQuestionSaveError(value.comprehensionQuestions[index], true)
      if (nestedError) return `Question ${index + 1}: ${nestedError}`
    }

    return null
  }

  if (!hasEditorText(value.body)) {
    return 'Type the question'
  }

  if (isChoiceQuestionType(value.questionType)) {
    const filledOptions = value.choiceOptions.filter((option) => hasEditorText(option.text))
    if (filledOptions.length < MIN_CHOICE_OPTIONS) {
      return `Add at least ${MIN_CHOICE_OPTIONS} options`
    }
    const correctOptions = value.choiceOptions.filter(
      (option) => option.isCorrect && hasEditorText(option.text),
    )
    if (value.questionType === 'multiple_choice') {
      if (correctOptions.length < 2) {
        return 'Select at least two correct options'
      }
    } else if (correctOptions.length !== 1) {
      return 'Select the correct option'
    }
  }

  if (isFillBlankQuestionType(value.questionType)) {
    if (!value.fillBlankAnswer.trim()) {
      return 'Enter the correct answer'
    }
    if (
      (value.answerType === 'numeric' || value.answerType === 'numbers') &&
      !Number.isFinite(Number(value.fillBlankAnswer))
    ) {
      return 'Enter a numeric answer'
    }
  }

  return null
}

import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Loader, PageLoader } from '@/components/shared/loader/loader'
import { RichTextEditor } from '@/components/shared/rich-text-editor'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  useLanguages,
  useSubjects,
  useTopics,
} from '@/features/test-manager/api/use-question-entry-options'
import { useSaveQuestion } from '@/features/test-manager/api/questions-mutations'
import { useQuestion } from '@/features/test-manager/api/use-question'
import { useQuestions } from '@/features/test-manager/api/use-questions'
import { ChoiceQuestionForm } from '@/features/test-manager/components/choice-question-form'
import { ComprehensionQuestionForm } from '@/features/test-manager/components/comprehension-question-form'
import { FillBlankQuestionForm } from '@/features/test-manager/components/fill-blank-question-form'
import { FieldError, FormFieldLabel } from '@/features/test-manager/components/form-field-label'
import { QuestionList } from '@/features/test-manager/components/question-list'
import { QuestionTranslationForm } from '@/features/test-manager/components/question-translation-form'
import {
  MIN_CHOICE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
} from '@/features/test-manager/constants/step-3-questions'
import {
  applyPrimaryLanguage,
  canShowQuestionEditor,
  createDraftQuestion,
  emptyQuestionTranslation,
  emptyQuestionsData,
  ensureEnglishSelected,
  findEnglishLanguage,
  getQuestionSaveError,
  isChoiceQuestionType,
  isComprehensionQuestionType,
  isEnglishLanguage,
  isFillBlankQuestionType,
  questionApiCount,
  resolvePrimaryLanguageId,
  shouldShowLanguageTabs,
  sortEnglishFirst,
  syncQuestionTranslations,
  withChoiceQuestionDefaults,
  type QuestionsData,
  type QuestionsStepData,
  type SavedQuestion,
} from '@/features/test-manager/schema/step-3-questions.schema'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'

type Step3QuestionsProps = {
  testId?: string | null
  value?: QuestionsStepData | QuestionsData
  totalQuestions?: number
  onChange: (value: QuestionsStepData) => void
}

type Option = {
  value: string
  label: string
}

function withSelectedOption(options: Option[], selectedValue?: string) {
  if (!selectedValue) return options
  if (options.some((option) => option.value === selectedValue)) return options
  return [{ value: selectedValue, label: selectedValue }, ...options]
}

function withSelectedOptions(options: Option[], selectedValues: string[] = []) {
  return selectedValues.reduce(
    (next, selectedValue) => withSelectedOption(next, selectedValue),
    options,
  )
}

function LanguageCheckboxes({
  options,
  selectedIds,
  disabled,
  onToggle,
}: {
  options: Option[]
  selectedIds: string[]
  disabled?: boolean
  onToggle: (id: string) => void
}) {
  if (options.length === 0) return null

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const isEnglish = isEnglishLanguage(option.value, option.label)
        const checked = isEnglish || selectedIds.includes(option.value)
        const id = `question-language-${option.value}`
        return (
          <label key={option.value} className="flex items-center gap-2 text-sm" htmlFor={id}>
            <input
              id={id}
              type="checkbox"
              checked={checked}
              disabled={disabled || isEnglish}
              onChange={() => onToggle(option.value)}
              className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
            />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}

function SidebarSelect({
  id,
  value,
  placeholder,
  options,
  disabled,
  invalid,
  onChange,
}: {
  id: string
  value: string
  placeholder: string
  options: readonly Option[]
  disabled?: boolean
  invalid?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid ? true : undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function Step3Questions({
  testId,
  totalQuestions = 0,
}: Omit<Step3QuestionsProps, 'value' | 'onChange'> & {
  value?: QuestionsStepData | QuestionsData
  onChange?: (value: QuestionsStepData) => void
}) {
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingQuestion, setEditingQuestion] = useState<SavedQuestion | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [fallbackDraft] = useState(() => createDraftQuestion())
  const current = editingQuestion ?? fallbackDraft
  const options: SavedQuestion = {
    ...emptyQuestionsData,
    ...current,
    choiceOptions: current.choiceOptions ?? emptyQuestionsData.choiceOptions,
    tags: current.tags ?? emptyQuestionsData.tags,
    comprehensionQuestions:
      current.comprehensionQuestions ?? emptyQuestionsData.comprehensionQuestions,
    languageIds: current.languageIds ?? emptyQuestionsData.languageIds,
    translations: current.translations ?? emptyQuestionsData.translations,
    languageContentIds: current.languageContentIds ?? emptyQuestionsData.languageContentIds,
    serverId: current.serverId,
  }
  const {
    data: questionList = [],
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
    refetch: refetchList,
  } = useQuestions(testId ?? null)
  const {
    data: questionDetail,
    isFetching: isDetailFetching,
    isError: isDetailError,
    error: detailError,
  } = useQuestion(selectedQuestionId)
  const currentQuestionNo = options.serverId
    ? questionList.findIndex((item) => item.id === options.serverId) + 1 || questionList.length
    : questionList.length + 1
  const [saveError, setSaveError] = useState<string>()
  const [activeLanguageId, setActiveLanguageId] = useState('')
  const saveQuestion = useSaveQuestion(testId)
  const {
    data: subjectOptions = [],
    isLoading: isSubjectsLoading,
    isError: isSubjectsError,
    error: subjectsError,
  } = useSubjects()
  const {
    data: allTopics = [],
    isLoading: isTopicsLoading,
    isError: isTopicsError,
    error: topicsError,
  } = useTopics()
  const topicOptions = options.subjectId
    ? allTopics.some((topic) => topic.subjectId)
      ? allTopics.filter((topic) => !topic.subjectId || topic.subjectId === options.subjectId)
      : allTopics
    : []
  const {
    data: languageOptions = [],
    isLoading: isLanguagesLoading,
    isError: isLanguagesError,
    error: languagesError,
  } = useLanguages()

  const subjectChoices = withSelectedOption(subjectOptions, options.subjectId)
  const topicChoices = withSelectedOption(topicOptions, options.topicId)
  const languageChoices = sortEnglishFirst(
    withSelectedOptions(
      languageOptions,
      options.languageIds.length > 0 ? options.languageIds : [options.language],
    ),
  )
  const primaryLanguageId =
    resolvePrimaryLanguageId(options.languageIds, languageChoices) || options.language
  const showLanguageTabs = shouldShowLanguageTabs(options.languageIds, languageChoices)
  const selectedLanguages = sortEnglishFirst(
    languageChoices.filter(
      (option) =>
        options.languageIds.includes(option.value) || isEnglishLanguage(option.value, option.label),
    ),
  )
  const currentLanguageId = options.languageIds.includes(activeLanguageId)
    ? activeLanguageId
    : primaryLanguageId
  const isPrimaryLanguageTab = !showLanguageTabs || currentLanguageId === primaryLanguageId
  const activeTranslation =
    options.translations.find((translation) => translation.languageId === currentLanguageId) ??
    emptyQuestionTranslation(currentLanguageId, options)
  const currentLanguageLabel =
    languageChoices.find((option) => option.value === currentLanguageId)?.label ?? 'this language'
  const showEditorPlaceholder = canShowQuestionEditor(options)

  const replaceCurrent = (next: SavedQuestion) => {
    setEditingQuestion(next)
  }

  const update = (patch: Partial<QuestionsData>) => {
    setSaveError(undefined)
    const next = { ...options, ...patch }
    replaceCurrent({
      ...next,
      translations: syncQuestionTranslations(next),
    })
  }

  const toggleLanguage = (languageId: string) => {
    const english = findEnglishLanguage(languageChoices)
    if (english && languageId === english.value) return

    const nextIds = options.languageIds.includes(languageId)
      ? options.languageIds.filter((id) => id !== languageId)
      : [...options.languageIds, languageId]
    const { languageIds, language } = ensureEnglishSelected(nextIds, languageChoices)
    update({ languageIds, language })
    if (!languageIds.includes(currentLanguageId)) {
      setActiveLanguageId(language)
    }
  }

  const backToList = () => {
    setView('list')
    setSelectedQuestionId(null)
    setEditingQuestion(null)
    setSaveError(undefined)
    setActiveLanguageId('')
  }

  const handleAddQuestion = () => {
    const questionLimit = totalQuestions > 0 ? totalQuestions : undefined
    if (questionLimit && questionList.length >= questionLimit) {
      toast.error(`You cannot add more questions. This test allows ${questionLimit} questions.`)
      return
    }

    setSelectedQuestionId(null)
    setEditingQuestion(createDraftQuestion())
    setSaveError(undefined)
    setActiveLanguageId('')
    setView('editor')
  }

  const handleSelectQuestion = (id: string) => {
    setSaveError(undefined)
    setActiveLanguageId('')
    setEditingQuestion(null)
    setSelectedQuestionId(id)
    setView('editor')
  }

  const handleSave = () => {
    const questionLimit = totalQuestions > 0 ? totalQuestions : undefined
    const limitMessage = questionLimit
      ? `You cannot add more questions. This test allows ${questionLimit} questions.`
      : 'You cannot add more questions.'

    if (questionLimit && !options.serverId && questionList.length + questionApiCount(options) > questionLimit) {
      setSaveError(limitMessage)
      toast.error(limitMessage)
      return
    }

    const error = getQuestionSaveError(options)
    if (error) {
      setSaveError(error)
      toast.error(error)
      return
    }

    if (!testId) {
      const message = 'Create the test first'
      setSaveError(message)
      toast.error(message)
      return
    }

    saveQuestion.mutate(
      {
        testId,
        question: options,
      },
      {
        onSuccess: () => {
          setSaveError(undefined)
          toast.success(
            options.serverId
              ? `Question ${currentQuestionNo} updated`
              : `Question ${currentQuestionNo} saved`,
          )
          backToList()
        },
        onError: (saveErrorValue) => {
          const message = getApiErrorMessage(saveErrorValue)
          setSaveError(message)
          toast.error(message)
        },
      },
    )
  }

  useEffect(() => {
    if (view !== 'editor' || languageOptions.length === 0 || !editingQuestion) return

    const next = ensureEnglishSelected(options.languageIds, languageOptions)
    if (
      next.language === options.language &&
      next.languageIds.join(',') === options.languageIds.join(',')
    ) {
      return
    }

    replaceCurrent(applyPrimaryLanguage(options, next.languageIds, next.language))
  }, [languageOptions, options.language, options.languageIds, options.id, view, editingQuestion?.id])

  useEffect(() => {
    if (!questionDetail || !selectedQuestionId) return
    setEditingQuestion(questionDetail)
  }, [questionDetail, selectedQuestionId])

  useEffect(() => {
    if (view !== 'editor' || !editingQuestion) return
    if (!isChoiceQuestionType(options.questionType)) return
    if (options.choiceOptions.length >= MIN_CHOICE_OPTIONS) return
    replaceCurrent({ ...withChoiceQuestionDefaults(options), id: options.id, saved: options.saved })
  }, [options.choiceOptions.length, options.questionType, options.id, view, editingQuestion?.id])

  const topicPlaceholder = !options.subjectId
    ? 'Select a subject first'
    : isTopicsLoading
      ? 'Loading topics…'
      : isTopicsError
        ? 'Unable to load topics'
        : topicChoices.length === 0
          ? 'No topics available'
          : 'Select Topic'

  const subjectLabels = new Map(subjectOptions.map((option) => [option.value, option.label]))
  const topicLabels = new Map(allTopics.map((option) => [option.value, option.label]))
  const canAddQuestion = totalQuestions <= 0 || questionList.length < totalQuestions

  if (view === 'list') {
    if (isListLoading) return <PageLoader label="Loading questions…" />
    if (isListError) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-destructive">{getApiErrorMessage(listError)}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchList()}>
            Retry
          </Button>
        </div>
      )
    }

    return (
      <QuestionList
        items={questionList}
        subjectLabels={subjectLabels}
        topicLabels={topicLabels}
        totalQuestions={totalQuestions}
        canAdd={canAddQuestion}
        onAdd={handleAddQuestion}
        onSelect={handleSelectQuestion}
      />
    )
  }

  if (selectedQuestionId && (isDetailFetching && !editingQuestion)) {
    return <PageLoader label="Loading question…" />
  }

  if (selectedQuestionId && isDetailError && !editingQuestion) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{getApiErrorMessage(detailError)}</p>
        <Button type="button" variant="outline" size="sm" onClick={backToList}>
          Back to questions
        </Button>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="-mx-6 -mt-6 flex min-h-[36rem] items-start rounded-t-md border-b border-border">
        <aside className="sticky top-0 z-20 w-72 shrink-0 space-y-4 self-start overflow-y-auto border-r border-border bg-card p-4 max-h-[calc(100vh-3.5rem)]">
          <h2 className="text-sm font-semibold">Question Entry Options</h2>

          <div className="space-y-2">
            <FormFieldLabel
              htmlFor="question-subject"
              required
              hint="Subject this question belongs to."
            >
              Select Subject
            </FormFieldLabel>
            <SidebarSelect
              id="question-subject"
              value={options.subjectId}
              placeholder={
                isSubjectsLoading
                  ? 'Loading subjects…'
                  : isSubjectsError
                    ? 'Unable to load subjects'
                    : 'Select Subject'
              }
              options={subjectChoices}
              disabled={isSubjectsLoading || isSubjectsError}
              invalid={isSubjectsError}
              onChange={(subjectId) => update({ subjectId, topicId: '' })}
            />
            <FieldError message={isSubjectsError ? getApiErrorMessage(subjectsError) : undefined} />
          </div>

          <div className="space-y-2">
            <FormFieldLabel
              htmlFor="question-topic"
              required
              hint="Topic within the selected subject."
            >
              Select Topic
            </FormFieldLabel>
            <SidebarSelect
              id="question-topic"
              value={options.topicId}
              placeholder={topicPlaceholder}
              options={topicChoices}
              disabled={
                !options.subjectId ||
                isTopicsLoading ||
                isTopicsError ||
                topicChoices.length === 0
              }
              invalid={isTopicsError}
              onChange={(topicId) => update({ topicId })}
            />
            <FieldError message={isTopicsError ? getApiErrorMessage(topicsError) : undefined} />
          </div>

          <div className="space-y-2">
            <FormFieldLabel
              htmlFor="question-type"
              required
              hint="Format used to enter and score this question."
            >
              Question Type
            </FormFieldLabel>
            <SidebarSelect
              id="question-type"
              value={options.questionType}
              placeholder="Select Question Type"
              options={QUESTION_TYPE_OPTIONS}
              onChange={(questionType) => update(withChoiceQuestionDefaults(options, questionType))}
            />
          </div>

          <div className="space-y-2">
            <FormFieldLabel hint="English stays selected. Check another language to show translation tabs.">
              Languages
            </FormFieldLabel>
            {isLanguagesLoading ? (
              <p className="text-sm text-muted-foreground">Loading languages…</p>
            ) : isLanguagesError ? (
              <p className="text-sm text-destructive">Unable to load languages</p>
            ) : (
              <LanguageCheckboxes
                options={languageChoices}
                selectedIds={options.languageIds}
                disabled={isLanguagesLoading || isLanguagesError}
                onToggle={toggleLanguage}
              />
            )}
            <FieldError
              message={isLanguagesError ? getApiErrorMessage(languagesError) : undefined}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total Question
            </p>
            <p className="text-sm font-medium">
              {totalQuestions > 0 ? totalQuestions : '—'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current Question No.
            </p>
            <p className="text-sm font-medium">{currentQuestionNo}</p>
          </div>
        </aside>

        <section className="min-w-0 min-h-[36rem] flex-1 bg-background">
          <div className="min-w-0 p-4">
            {showEditorPlaceholder ? (
              <div className="space-y-4">
                {showLanguageTabs ? (
                  <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                    {selectedLanguages.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                          currentLanguageId === option.value
                            ? 'nav-active'
                            : 'bg-muted text-muted-foreground',
                        )}
                        onClick={() => setActiveLanguageId(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {isPrimaryLanguageTab ? (
                  isComprehensionQuestionType(options.questionType) ? (
                    <ComprehensionQuestionForm
                      key={options.id}
                      value={options}
                      onChange={(next) => update(next)}
                    />
                  ) : (
                    <div key={options.id} className="space-y-4">
                      <div className="space-y-2">
                        <FormFieldLabel
                          required
                          hint="Write the question stem candidates will see."
                        >
                          Type Your Question
                        </FormFieldLabel>
                        <RichTextEditor
                          value={options.body}
                          onChange={(body) => update({ body })}
                          placeholder="Type the question…"
                          minHeight="12rem"
                        />
                      </div>

                      {isChoiceQuestionType(options.questionType) ? (
                        <ChoiceQuestionForm
                          multiple={options.questionType === 'multiple_choice'}
                          value={options}
                          onChange={(next) => update(next)}
                        />
                      ) : null}

                      {isFillBlankQuestionType(options.questionType) ? (
                        <FillBlankQuestionForm value={options} onChange={(next) => update(next)} />
                      ) : null}
                    </div>
                  )
                ) : (
                  <QuestionTranslationForm
                    key={`${options.id}-${currentLanguageId}`}
                    primary={options}
                    translation={activeTranslation}
                    languageLabel={currentLanguageLabel}
                    onChange={(translation) =>
                      update({
                        translations: options.translations.some(
                          (item) => item.languageId === translation.languageId,
                        )
                          ? options.translations.map((item) =>
                              item.languageId === translation.languageId ? translation : item,
                            )
                          : [...options.translations, translation],
                      })
                    }
                  />
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[20rem] items-center justify-center">
                <p className="text-center text-sm text-muted-foreground">
                  Select subject, topic and question type...
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={backToList}>
                <ChevronLeft className="h-4 w-4" />
                Back to questions
              </Button>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <FieldError message={saveError} />
                <Button type="button" onClick={handleSave} disabled={saveQuestion.isPending}>
                  {saveQuestion.isPending ? (
                    <>
                      <Loader size="sm" />
                      Saving…
                    </>
                  ) : (
                    'Save Question'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </TooltipProvider>
  )
}

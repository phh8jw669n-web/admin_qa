import { RichTextEditor } from '@/components/shared/rich-text-editor'
import { Input } from '@/components/ui/input'
import { FormFieldLabel } from '@/features/test-manager/components/form-field-label'
import {
  choiceOptionLabel,
  isChoiceQuestionType,
  isComprehensionQuestionType,
  isFillBlankQuestionType,
  type NestedQuestionTranslation,
  type QuestionsData,
  type QuestionTranslation,
} from '@/features/test-manager/schema/step-3-questions.schema'

type QuestionTranslationFormProps = {
  primary: QuestionsData
  translation: QuestionTranslation
  languageLabel: string
  onChange: (value: QuestionTranslation) => void
}

export function QuestionTranslationForm({
  primary,
  translation,
  languageLabel,
  onChange,
}: QuestionTranslationFormProps) {
  const update = (patch: Partial<QuestionTranslation>) => {
    onChange({ ...translation, ...patch })
  }

  const updateOption = (id: string, text: string) => {
    update({
      choiceOptions: translation.choiceOptions.map((option) =>
        option.id === id ? { ...option, text } : option,
      ),
    })
  }

  const updateNested = (id: string, patch: Partial<NestedQuestionTranslation>) => {
    update({
      comprehensionQuestions: translation.comprehensionQuestions.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    })
  }

  return (
    <div className="space-y-4">
      <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        Paste the {languageLabel} version of the question, options, and explanation.
      </p>

      {isComprehensionQuestionType(primary.questionType) ? (
        <div className="space-y-2">
          <FormFieldLabel required hint="Passage or summary in this language.">
            Add Summary
          </FormFieldLabel>
          <RichTextEditor
            value={translation.comprehensionSummary}
            onChange={(comprehensionSummary) => update({ comprehensionSummary })}
            placeholder={`Type the ${languageLabel} summary…`}
            minHeight="12rem"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <FormFieldLabel required hint="Question stem in this language.">
            Type Your Question
          </FormFieldLabel>
          <RichTextEditor
            value={translation.body}
            onChange={(body) => update({ body })}
            placeholder={`Type the ${languageLabel} question…`}
            minHeight="12rem"
          />
        </div>
      )}

      {isChoiceQuestionType(primary.questionType) ? (
        <TranslationOptions
          options={translation.choiceOptions}
          useTextEditor={primary.useTextEditor}
          languageLabel={languageLabel}
          onChange={updateOption}
        />
      ) : null}

      {isFillBlankQuestionType(primary.questionType) ? (
        <div className="space-y-2">
          <FormFieldLabel hint="Correct answer in this language.">Correct Answer</FormFieldLabel>
          <Input
            value={translation.fillBlankAnswer}
            onChange={(event) => update({ fillBlankAnswer: event.target.value })}
            placeholder={`Enter the ${languageLabel} answer`}
          />
        </div>
      ) : null}

      {isComprehensionQuestionType(primary.questionType)
        ? primary.comprehensionQuestions.map((question, index) => {
            const nested =
              translation.comprehensionQuestions.find((item) => item.id === question.id) ?? {
                id: question.id,
                body: '',
                explanation: '',
                fillBlankAnswer: '',
                choiceOptions: question.choiceOptions.map((option) => ({
                  id: option.id,
                  text: '',
                })),
              }

            return (
              <div key={question.id} className="space-y-4 rounded-md border border-border p-3">
                <p className="text-sm font-medium">Question {index + 1}</p>
                <div className="space-y-2">
                  <FormFieldLabel required>Type Your Question</FormFieldLabel>
                  <RichTextEditor
                    value={nested.body}
                    onChange={(body) => updateNested(question.id, { body })}
                    placeholder={`Type the ${languageLabel} question…`}
                    minHeight="12rem"
                  />
                </div>
                {isChoiceQuestionType(question.questionType) ? (
                  <TranslationOptions
                    options={nested.choiceOptions}
                    useTextEditor={question.useTextEditor}
                    languageLabel={languageLabel}
                    onChange={(id, text) =>
                      updateNested(question.id, {
                        choiceOptions: nested.choiceOptions.map((option) =>
                          option.id === id ? { ...option, text } : option,
                        ),
                      })
                    }
                  />
                ) : null}
                {isFillBlankQuestionType(question.questionType) ? (
                  <Input
                    value={nested.fillBlankAnswer}
                    onChange={(event) =>
                      updateNested(question.id, { fillBlankAnswer: event.target.value })
                    }
                    placeholder={`Enter the ${languageLabel} answer`}
                  />
                ) : null}
                <div className="space-y-2">
                  <FormFieldLabel>Add Explanation</FormFieldLabel>
                  <RichTextEditor
                    value={nested.explanation}
                    onChange={(explanation) => updateNested(question.id, { explanation })}
                    placeholder={`Add the ${languageLabel} explanation…`}
                    minHeight="12rem"
                  />
                </div>
              </div>
            )
          })
        : null}

      {!isComprehensionQuestionType(primary.questionType) ? (
        <div className="space-y-2">
          <FormFieldLabel hint="Explanation in this language.">Add Explanation</FormFieldLabel>
          <RichTextEditor
            value={translation.explanation}
            onChange={(explanation) => update({ explanation })}
            placeholder={`Add the ${languageLabel} explanation…`}
            minHeight="12rem"
          />
        </div>
      ) : null}
    </div>
  )
}

function TranslationOptions({
  options,
  useTextEditor,
  languageLabel,
  onChange,
}: {
  options: Array<{ id: string; text: string }>
  useTextEditor: boolean
  languageLabel: string
  onChange: (id: string, text: string) => void
}) {
  if (options.length === 0) return null

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Question Option
      </div>
      {options.map((option, index) => {
        const letter = choiceOptionLabel(index)
        return (
          <div key={option.id} className="flex items-stretch border-b border-border last:border-b-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-sm font-semibold text-primary-foreground">
              {letter}
            </span>
            <div className="min-w-0 flex-1">
              {useTextEditor ? (
                <div className="p-2">
                  <RichTextEditor
                    value={option.text}
                    onChange={(text) => onChange(option.id, text)}
                    placeholder={`${languageLabel} option ${letter}`}
                    minHeight="8rem"
                  />
                </div>
              ) : (
                <Input
                  value={option.text}
                  onChange={(event) => onChange(option.id, event.target.value)}
                  placeholder={`${languageLabel} option ${letter}`}
                  className="h-10 rounded-none border-0 shadow-none focus-visible:ring-0"
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

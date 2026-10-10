import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { RichTextEditor } from '@/components/shared/rich-text-editor'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChoiceQuestionForm } from '@/features/test-manager/components/choice-question-form'
import { FillBlankQuestionForm } from '@/features/test-manager/components/fill-blank-question-form'
import { FormFieldLabel } from '@/features/test-manager/components/form-field-label'
import {
  QuestionAdvanceOptionsSection,
  QuestionExplanationSection,
} from '@/features/test-manager/components/question-entry-sections'
import { COMPREHENSION_SUB_QUESTION_TYPES } from '@/features/test-manager/constants/step-3-questions'
import {
  createNestedQuestion,
  isChoiceQuestionType,
  isFillBlankQuestionType,
  withChoiceQuestionDefaults,
  type NestedQuestionData,
  type QuestionsData,
} from '@/features/test-manager/schema/step-3-questions.schema'

type ComprehensionQuestionFormProps = {
  value: QuestionsData
  onChange: (value: QuestionsData) => void
}

function subQuestionLabel(type: string) {
  return (
    COMPREHENSION_SUB_QUESTION_TYPES.find((option) => option.value === type)?.label ?? 'Question'
  )
}

export function ComprehensionQuestionForm({ value, onChange }: ComprehensionQuestionFormProps) {
  const nestedQuestions = value.comprehensionQuestions ?? []
  const [openId, setOpenId] = useState<string | null>(nestedQuestions[0]?.id ?? null)

  const update = (patch: Partial<QuestionsData>) => {
    onChange({ ...value, ...patch })
  }

  const addQuestion = (questionType: string) => {
    const next = createNestedQuestion(questionType, value)
    update({ comprehensionQuestions: [...nestedQuestions, next] })
    setOpenId(next.id)
  }

  const updateQuestion = (id: string, next: NestedQuestionData) => {
    update({
      comprehensionQuestions: nestedQuestions.map((question) =>
        question.id === id ? next : question,
      ),
    })
  }

  const changeQuestionType = (id: string, questionType: string) => {
    const current = nestedQuestions.find((question) => question.id === id)
    if (!current) return
    updateQuestion(id, {
      ...withChoiceQuestionDefaults(current, questionType),
      id,
    })
  }

  const removeQuestion = (id: string) => {
    const remaining = nestedQuestions.filter((question) => question.id !== id)
    update({ comprehensionQuestions: remaining })
    if (openId === id) setOpenId(remaining[0]?.id ?? null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <FormFieldLabel required hint="Passage or summary that the follow-up questions are based on.">
          Add Summary
        </FormFieldLabel>
        <RichTextEditor
          value={value.comprehensionSummary}
          onChange={(comprehensionSummary) => update({ comprehensionSummary })}
          placeholder="Type the comprehension summary…"
          minHeight="12rem"
        />
      </div>

      <QuestionExplanationSection value={value} onChange={update} />
      <QuestionAdvanceOptionsSection value={value} onChange={update} />

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Questions</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COMPREHENSION_SUB_QUESTION_TYPES.map((option) => (
              <DropdownMenuItem key={option.value} onSelect={() => addQuestion(option.value)}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {nestedQuestions.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Add Single Choice, Multiple Choice, or Fill in the Blanks questions for this passage.
        </p>
      ) : (
        <div className="space-y-3">
          {nestedQuestions.map((question, index) => {
            const isOpen = openId === question.id
            const prefix = `comprehension-${question.id}`

            return (
              <div key={question.id} className="overflow-hidden rounded-md border border-border">
                <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                  <button
                    type="button"
                    className="mr-auto text-left text-sm font-medium"
                    onClick={() => setOpenId(isOpen ? null : question.id)}
                  >
                    Question {index + 1}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {subQuestionLabel(question.questionType)}
                    </span>
                  </button>
                  <Select
                    value={question.questionType}
                    onValueChange={(questionType) => changeQuestionType(question.id, questionType)}
                  >
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPREHENSION_SUB_QUESTION_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => removeQuestion(question.id)}
                    aria-label={`Remove question ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isOpen ? (
                  <div className="space-y-4 p-3">
                    <div className="space-y-2">
                      <FormFieldLabel
                        required
                        hint="Write the question stem candidates will see."
                      >
                        Type Your Question
                      </FormFieldLabel>
                      <RichTextEditor
                        value={question.body}
                        onChange={(body) => updateQuestion(question.id, { ...question, body })}
                        placeholder="Type the question…"
                        minHeight="12rem"
                      />
                    </div>

                    {isChoiceQuestionType(question.questionType) ? (
                      <ChoiceQuestionForm
                        multiple={question.questionType === 'multiple_choice'}
                        value={question}
                        idPrefix={prefix}
                        onChange={(next) => updateQuestion(question.id, { ...next, id: question.id })}
                      />
                    ) : null}

                    {isFillBlankQuestionType(question.questionType) ? (
                      <FillBlankQuestionForm
                        value={question}
                        idPrefix={prefix}
                        onChange={(next) => updateQuestion(question.id, { ...next, id: question.id })}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { Maximize2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FormFieldLabel } from '@/features/test-manager/components/form-field-label'
import {
  keepNumeric,
  QuestionAdvanceOptionsSection,
  QuestionExplanationSection,
} from '@/features/test-manager/components/question-entry-sections'
import { FILL_BLANK_ANSWER_TYPE_OPTIONS } from '@/features/test-manager/constants/step-3-questions'
import type { QuestionsData } from '@/features/test-manager/schema/step-3-questions.schema'

type FillBlankQuestionFormProps = {
  value: QuestionsData
  onChange: (value: QuestionsData) => void
  idPrefix?: string
}

export function FillBlankQuestionForm({
  value,
  onChange,
  idPrefix = '',
}: FillBlankQuestionFormProps) {
  const [expanded, setExpanded] = useState(false)
  const isNumeric = value.answerType === 'numeric' || value.answerType === 'numbers'

  const update = (patch: Partial<QuestionsData>) => {
    onChange({ ...value, ...patch })
  }

  const updateAnswer = (next: string) => {
    update({ fillBlankAnswer: isNumeric ? keepNumeric(next) : next })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FormFieldLabel
          htmlFor={idPrefix ? `${idPrefix}-fill-blank-answer-type` : 'fill-blank-answer-type'}
          hint="Format of the expected answer."
        >
          Select The Answer Type
        </FormFieldLabel>
        <Select
          value={value.answerType || 'alphanumeric'}
          onValueChange={(answerType) =>
            update({
              answerType,
              fillBlankAnswer:
                answerType === 'numeric' || answerType === 'numbers'
                  ? keepNumeric(value.fillBlankAnswer)
                  : value.fillBlankAnswer,
            })
          }
        >
          <SelectTrigger
            id={idPrefix ? `${idPrefix}-fill-blank-answer-type` : 'fill-blank-answer-type'}
            className="w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILL_BLANK_ANSWER_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="ml-auto inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="normal-case tracking-normal">Document Upload</span>
          <Switch
            checked={value.useDocumentUpload}
            onCheckedChange={(useDocumentUpload) => update({ useDocumentUpload })}
            aria-label="Enable document upload for the answer"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex items-center gap-x-4 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="w-14">Correct</span>
          <span className="min-w-0 flex-1">Question Option / Correct Answer</span>
        </div>

        <div className="flex items-stretch">
          <span className="flex h-10 w-14 shrink-0 items-center justify-center bg-primary text-sm font-semibold text-primary-foreground">
            01
          </span>
          {expanded ? (
            <textarea
              value={value.fillBlankAnswer}
              onChange={(event) => updateAnswer(event.target.value)}
              placeholder="Enter the correct answer"
              rows={4}
              inputMode={isNumeric ? 'decimal' : 'text'}
              className="min-h-20 w-full resize-y border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          ) : (
            <Input
              value={value.fillBlankAnswer}
              onChange={(event) => updateAnswer(event.target.value)}
              placeholder="Enter the correct answer"
              inputMode={isNumeric ? 'decimal' : 'text'}
              className="h-10 rounded-none border-0 shadow-none focus-visible:ring-0"
            />
          )}
          <div className="flex shrink-0 items-center border-l border-border px-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setExpanded((current) => !current)}
              aria-label="Expand answer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {value.useDocumentUpload ? (
          <div className="flex items-center gap-2 border-t border-border bg-muted/20 px-3 py-2">
            <Input
              type="file"
              className="h-8 max-w-md text-xs"
              onChange={(event) =>
                update({ fillBlankDocumentName: event.target.files?.[0]?.name ?? '' })
              }
            />
            {value.fillBlankDocumentName ? (
              <span className="truncate text-xs text-muted-foreground">
                {value.fillBlankDocumentName}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <QuestionExplanationSection value={value} onChange={update} idPrefix={idPrefix} />

      <QuestionAdvanceOptionsSection value={value} onChange={update} idPrefix={idPrefix}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FormFieldLabel
              htmlFor={idPrefix ? `${idPrefix}-range-from` : 'range-from'}
              hint="Lowest accepted numeric value."
            >
              Range From
            </FormFieldLabel>
            <Input
              id={idPrefix ? `${idPrefix}-range-from` : 'range-from'}
              inputMode="decimal"
              value={value.rangeFrom}
              onChange={(event) => update({ rangeFrom: keepNumeric(event.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <FormFieldLabel
              htmlFor={idPrefix ? `${idPrefix}-range-to` : 'range-to'}
              hint="Highest accepted numeric value."
            >
              Range To
            </FormFieldLabel>
            <Input
              id={idPrefix ? `${idPrefix}-range-to` : 'range-to'}
              inputMode="decimal"
              value={value.rangeTo}
              onChange={(event) => update({ rangeTo: keepNumeric(event.target.value) })}
            />
          </div>
        </div>
      </QuestionAdvanceOptionsSection>
    </div>
  )
}

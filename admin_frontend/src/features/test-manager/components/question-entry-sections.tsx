import { Minus, Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { RichTextEditor } from '@/components/shared/rich-text-editor'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDifficulties } from '@/features/test-manager/api/use-question-entry-options'
import { FieldError, FormFieldLabel } from '@/features/test-manager/components/form-field-label'
import type { QuestionsData } from '@/features/test-manager/schema/step-3-questions.schema'
import { getApiErrorMessage } from '@/lib/axios'

type UpdateQuestions = (patch: Partial<QuestionsData>) => void

function fieldId(prefix: string | undefined, name: string) {
  return prefix ? `${prefix}-${name}` : name
}

export function keepInteger(value: string) {
  return value.replace(/\D/g, '')
}

export function keepNumeric(value: string) {
  const stripped = value.replace(/[^\d.-]/g, '')
  const minus = stripped.startsWith('-') ? '-' : ''
  const rest = stripped.replace(/-/g, '')
  const [whole = '', ...fraction] = rest.split('.')
  return fraction.length > 0 ? `${minus}${whole}.${fraction.join('')}` : `${minus}${whole}`
}

function withSelectedOption(
  options: Array<{ value: string; label: string }>,
  selectedValue?: string,
) {
  if (!selectedValue) return options
  if (options.some((option) => option.value === selectedValue)) return options
  return [{ value: selectedValue, label: selectedValue }, ...options]
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="overflow-hidden rounded-md border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/40"
      >
        {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {title}
      </button>
      {open ? <div className="space-y-4 border-t border-border px-3 py-3">{children}</div> : null}
    </section>
  )
}

export function QuestionExplanationSection({
  value,
  onChange,
  idPrefix,
}: {
  value: QuestionsData
  onChange: UpdateQuestions
  idPrefix?: string
}) {
  const videoId = fieldId(idPrefix, 'video-solution-url')

  return (
    <CollapsibleSection title="Add Explanation">
      <RichTextEditor
        value={value.explanation}
        onChange={(explanation) => onChange({ explanation })}
        placeholder="Add an explanation for the correct answer…"
        minHeight="12rem"
      />

      <div className="space-y-2">
        <FormFieldLabel htmlFor={videoId} hint="Optional video walkthrough for this question.">
          Video Solution Url
        </FormFieldLabel>
        <Input
          id={videoId}
          value={value.videoSolutionUrl}
          onChange={(event) => onChange({ videoSolutionUrl: event.target.value })}
          placeholder="Enter url for Web"
          className="max-w-xl"
        />
      </div>
    </CollapsibleSection>
  )
}

export function QuestionAdvanceOptionsSection({
  value,
  onChange,
  children,
  idPrefix,
}: {
  value: QuestionsData
  onChange: UpdateQuestions
  children?: ReactNode
  idPrefix?: string
}) {
  const [tagDraft, setTagDraft] = useState('')
  const rightMarksId = fieldId(idPrefix, 'right-marks')
  const negativeMarksId = fieldId(idPrefix, 'negative-marks')
  const {
    data: difficultyOptions = [],
    isLoading: isDifficultiesLoading,
    isError: isDifficultiesError,
    error: difficultiesError,
  } = useDifficulties()
  const difficultyChoices = withSelectedOption(difficultyOptions, value.difficultyLevel)

  const addTag = () => {
    const tag = tagDraft.trim()
    if (!tag || value.tags.includes(tag)) {
      setTagDraft('')
      return
    }
    onChange({ tags: [...value.tags, tag] })
    setTagDraft('')
  }

  return (
    <CollapsibleSection title="Advance Options">
      <div className="space-y-2">
        <FormFieldLabel hint="Keywords used to find this question later.">Tags</FormFieldLabel>
        <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
          {value.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange({ tags: value.tags.filter((item) => item !== tag) })}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                addTag()
              }
            }}
            onBlur={addTag}
            placeholder="Add a tag"
            className="min-w-40 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <FormFieldLabel htmlFor={rightMarksId} hint="Marks awarded for a correct answer.">
            Right Marks
          </FormFieldLabel>
          <Input
            id={rightMarksId}
            inputMode="numeric"
            value={value.rightMarks}
            onChange={(event) => onChange({ rightMarks: keepNumeric(event.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <FormFieldLabel htmlFor={negativeMarksId} hint="Marks deducted for an incorrect answer.">
            Negative Marks
          </FormFieldLabel>
          <Input
            id={negativeMarksId}
            inputMode="numeric"
            value={value.negativeMarks}
            onChange={(event) => onChange({ negativeMarks: keepNumeric(event.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <FormFieldLabel hint="How hard this question is.">Difficulty Level</FormFieldLabel>
          <Select
            value={value.difficultyLevel || undefined}
            onValueChange={(difficultyLevel) => onChange({ difficultyLevel })}
            disabled={isDifficultiesLoading || isDifficultiesError}
          >
            <SelectTrigger aria-invalid={isDifficultiesError ? true : undefined}>
              <SelectValue
                placeholder={
                  isDifficultiesLoading
                    ? 'Loading difficulties…'
                    : isDifficultiesError
                      ? 'Unable to load difficulties'
                      : 'Select Difficulty'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {difficultyChoices.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError
            message={isDifficultiesError ? getApiErrorMessage(difficultiesError) : undefined}
          />
        </div>
      </div>

      {children}
    </CollapsibleSection>
  )
}

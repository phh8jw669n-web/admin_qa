import { Maximize2, Plus, X } from 'lucide-react'
import { useState } from 'react'

import { RichTextEditor } from '@/components/shared/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FormFieldLabel } from '@/features/test-manager/components/form-field-label'
import {
  QuestionAdvanceOptionsSection,
  QuestionExplanationSection,
} from '@/features/test-manager/components/question-entry-sections'
import { MAX_CHOICE_OPTIONS, MIN_CHOICE_OPTIONS } from '@/features/test-manager/constants/step-3-questions'
import {
  choiceOptionLabel,
  createChoiceOption,
  type QuestionChoiceOption,
  type QuestionsData,
} from '@/features/test-manager/schema/step-3-questions.schema'

type ChoiceQuestionFormProps = {
  multiple: boolean
  value: QuestionsData
  onChange: (value: QuestionsData) => void
  idPrefix?: string
}

export function ChoiceQuestionForm({
  multiple,
  value,
  onChange,
  idPrefix = '',
}: ChoiceQuestionFormProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const choiceOptions = value.choiceOptions

  const update = (patch: Partial<QuestionsData>) => {
    onChange({ ...value, choiceOptions, ...patch })
  }

  const updateOptions = (next: QuestionChoiceOption[]) => {
    update({ choiceOptions: next })
  }

  const toggleCorrect = (id: string) => {
    updateOptions(
      choiceOptions.map((option) => {
        if (multiple) {
          return option.id === id ? { ...option, isCorrect: !option.isCorrect } : option
        }
        return { ...option, isCorrect: option.id === id }
      }),
    )
  }

  const updateOption = (id: string, patch: Partial<QuestionChoiceOption>) => {
    updateOptions(choiceOptions.map((option) => (option.id === id ? { ...option, ...patch } : option)))
  }

  const addOption = () => {
    if (choiceOptions.length >= MAX_CHOICE_OPTIONS) return
    updateOptions([...choiceOptions, createChoiceOption()])
  }

  const removeOption = (id: string) => {
    if (choiceOptions.length <= MIN_CHOICE_OPTIONS) return
    updateOptions(choiceOptions.filter((option) => option.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="w-24">Correct</span>
          <span className="min-w-0 flex-1">Question Option</span>
          <label className="ml-auto inline-flex items-center gap-2 normal-case tracking-normal">
            <span>Σ Text Editor</span>
            <Switch
              checked={value.useTextEditor}
              onCheckedChange={(useTextEditor) => update({ useTextEditor })}
              aria-label="Use text editor for options"
            />
          </label>
          <label className="inline-flex items-center gap-2 normal-case tracking-normal">
            <span>Document Upload</span>
            <Switch
              checked={value.useDocumentUpload}
              onCheckedChange={(useDocumentUpload) => update({ useDocumentUpload })}
              aria-label="Enable document upload for options"
            />
          </label>
        </div>

        <div>
          {choiceOptions.map((option, index) => {
            const letter = choiceOptionLabel(index)
            const expanded = expandedIds.includes(option.id)
            const controlId = `choice-correct-${option.id}`

            return (
              <div key={option.id} className="border-b border-border last:border-b-0">
                <div className="flex items-stretch">
                  <div className="flex shrink-0">
                    <span className="flex h-10 w-10 items-center justify-center bg-primary text-sm font-semibold text-primary-foreground">
                      {letter}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center border-r border-border bg-card">
                      <input
                        id={controlId}
                        type={multiple ? 'checkbox' : 'radio'}
                        name={multiple ? undefined : `${idPrefix || 'choice'}-correct-answer`}
                        checked={option.isCorrect}
                        onChange={() => toggleCorrect(option.id)}
                        aria-label={`Mark option ${letter} as correct`}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    {value.useTextEditor ? (
                      <div className="p-2">
                        <RichTextEditor
                          value={option.text}
                          onChange={(text) => updateOption(option.id, { text })}
                          placeholder={`Option ${letter}`}
                          minHeight="12rem"
                        />
                      </div>
                    ) : expanded ? (
                      <textarea
                        value={option.text}
                        onChange={(event) => updateOption(option.id, { text: event.target.value })}
                        placeholder={`Option ${letter}`}
                        rows={4}
                        className="min-h-20 w-full resize-y border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                      />
                    ) : (
                      <Input
                        value={option.text}
                        onChange={(event) => updateOption(option.id, { text: event.target.value })}
                        placeholder={`Option ${letter}`}
                        className="h-10 rounded-none border-0 shadow-none focus-visible:ring-0"
                      />
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1 border-l border-border px-1">
                    {choiceOptions.length > MIN_CHOICE_OPTIONS ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => removeOption(option.id)}
                        aria-label={`Remove option ${letter}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() =>
                        setExpandedIds((current) =>
                          current.includes(option.id)
                            ? current.filter((id) => id !== option.id)
                            : [...current, option.id],
                        )
                      }
                      aria-label={`Expand option ${letter}`}
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
                        updateOption(option.id, {
                          documentName: event.target.files?.[0]?.name ?? '',
                        })
                      }
                    />
                    {option.documentName ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {option.documentName}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={choiceOptions.length >= MAX_CHOICE_OPTIONS}
        >
          <Plus className="h-4 w-4" />
          Add New Option
        </Button>
      </div>

      <QuestionExplanationSection value={value} onChange={update} idPrefix={idPrefix} />

      <QuestionAdvanceOptionsSection value={value} onChange={update} idPrefix={idPrefix}>
        <div className="space-y-2">
          <FormFieldLabel
            htmlFor={idPrefix ? `${idPrefix}-option-marks` : 'option-marks'}
            hint="Optional per-option marks, comma separated."
          >
            Option Marks
          </FormFieldLabel>
          <Input
            id={idPrefix ? `${idPrefix}-option-marks` : 'option-marks'}
            value={value.optionMarks}
            onChange={(event) => update({ optionMarks: event.target.value })}
            placeholder="Enter marks comma separated (e.g. 2,3,4,5)"
            className="max-w-xl"
          />
        </div>
      </QuestionAdvanceOptionsSection>
    </div>
  )
}

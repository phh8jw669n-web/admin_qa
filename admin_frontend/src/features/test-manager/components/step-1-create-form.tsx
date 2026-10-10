import { zodResolver } from '@hookform/resolvers/zod'
import { Clock } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useEffect, useMemo } from 'react'

import { RichTextEditor } from '@/components/shared/rich-text-editor'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useCategories } from '@/features/test-manager/api/use-categories'
import { useInstructions } from '@/features/test-manager/api/use-instructions'
import { FieldError, FormFieldLabel } from '@/features/test-manager/components/form-field-label'
import { TestTemplatePicker } from '@/features/test-manager/components/test-template-picker'
import {
  createTestSchema,
  emptyCreateTestValues,
  HANDICAPPED_MUST_EXCEED_DURATION_MESSAGE,
  isHandicappedNotMoreThanDuration,
  migrateCreateTestValues,
  type CreateTestFormValues,
} from '@/features/test-manager/schema/step-1-create.schema'
import { getApiErrorMessage } from '@/lib/axios'

const STEP_1_FORM_ID = 'step-1-create-form'

type Step1CreateFormProps = {
  defaultValues?: Partial<CreateTestFormValues>
  optionLabels?: {
    category?: string
    instruction?: string
  }
  onSubmit: (values: CreateTestFormValues) => void
}

function keepDigits(value: string) {
  return value.replace(/\D/g, '')
}

function parseMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function formatMinutes(total: number) {
  const clamped = Math.min(23 * 60 + 59, Math.max(0, total))
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function addOneMinute(value: string) {
  const minutes = parseMinutes(value)
  return minutes == null ? undefined : formatMinutes(minutes + 1)
}

function subtractOneMinute(value: string) {
  const minutes = parseMinutes(value)
  return minutes == null ? undefined : formatMinutes(minutes - 1)
}

function withSelectedOption(
  options: Array<{ value: string; label: string }>,
  selectedValue?: string,
  selectedLabel?: string,
) {
  if (!selectedValue) return options
  if (options.some((option) => option.value === selectedValue)) return options
  return [{ value: selectedValue, label: selectedLabel || selectedValue }, ...options]
}

function getInitialValues(existing?: Partial<CreateTestFormValues>): CreateTestFormValues {
  const migrated = migrateCreateTestValues(existing)

  return {
    ...emptyCreateTestValues,
    ...migrated,
    testCode: migrated.testCode || emptyCreateTestValues.testCode,
    categoryId: migrated.categoryId || emptyCreateTestValues.categoryId,
    primaryInstructionId: migrated.primaryInstructionId || emptyCreateTestValues.primaryInstructionId,
    templateId: migrated.templateId || emptyCreateTestValues.templateId,
  }
}

export function Step1CreateForm({ defaultValues, optionLabels, onSubmit }: Step1CreateFormProps) {
  const initialValues = useMemo(() => getInitialValues(defaultValues), [defaultValues])
  const {
    data: categoryOptions = [],
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    error: categoriesError,
  } = useCategories()
  const {
    data: instructionOptions = [],
    isLoading: isInstructionsLoading,
    isError: isInstructionsError,
    error: instructionsError,
  } = useInstructions()

  const {
    control,
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CreateTestFormValues>({
    resolver: zodResolver(createTestSchema),
    defaultValues: initialValues,
  })

  const durationMinutes = watch('durationMinutes')
  const handicappedDurationMinutes = watch('handicappedDurationMinutes')
  const startDate = watch('startDate')
  const endDate = watch('endDate')
  const startTime = watch('startTime')
  const endTime = watch('endTime')
  const handicappedErrorType = errors.handicappedDurationMinutes?.type
  const isSameDay = !startDate || !endDate || startDate === endDate
  const endTimeMin = isSameDay && startTime ? addOneMinute(startTime) : undefined
  const startTimeMax = isSameDay && endTime ? subtractOneMinute(endTime) : undefined

  useEffect(() => {
    if (isHandicappedNotMoreThanDuration(handicappedDurationMinutes, durationMinutes)) {
      if (handicappedErrorType !== 'mustExceedDuration') {
        setError('handicappedDurationMinutes', {
          type: 'mustExceedDuration',
          message: HANDICAPPED_MUST_EXCEED_DURATION_MESSAGE,
        })
      }
      return
    }

    if (handicappedErrorType === 'mustExceedDuration') {
      clearErrors('handicappedDurationMinutes')
    }
  }, [
    clearErrors,
    durationMinutes,
    handicappedDurationMinutes,
    handicappedErrorType,
    setError,
  ])

  const durationField = register('durationMinutes')
  const handicappedField = register('handicappedDurationMinutes')
  const questionsField = register('totalQuestions')
  const marksField = register('totalMarks')
  const passingMarksField = register('passingMarks')
  const graceMarksField = register('graceMarks')

  return (
    <TooltipProvider delayDuration={200}>
      <form
        id={STEP_1_FORM_ID}
        className="grid grid-cols-1 gap-8 lg:grid-cols-2"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <FormFieldLabel htmlFor="test-name" required>
              Test Name
            </FormFieldLabel>
            <Input
              id="test-name"
              placeholder="Enter test name"
              aria-invalid={errors.name ? true : undefined}
              {...register('name')}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-2">
            <FormFieldLabel htmlFor="test-description">Description</FormFieldLabel>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <RichTextEditor
                  variant="compact"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Enter test description"
                  minHeight="8rem"
                />
              )}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="space-y-2">
            <FormFieldLabel htmlFor="test-code" required>
              Test Code
            </FormFieldLabel>
            <Input
              id="test-code"
              placeholder="Enter test code"
              aria-invalid={errors.testCode ? true : undefined}
              {...register('testCode')}
            />
            <FieldError message={errors.testCode?.message} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FormFieldLabel htmlFor="test-category" required>
                Select Category
              </FormFieldLabel>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => {
                  const categoryChoices = withSelectedOption(
                    categoryOptions,
                    field.value,
                    optionLabels?.category,
                  )

                  return (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={isCategoriesLoading || isCategoriesError}
                    >
                      <SelectTrigger
                        id="test-category"
                        aria-invalid={errors.categoryId || isCategoriesError ? true : undefined}
                      >
                        <SelectValue
                          placeholder={
                            isCategoriesLoading
                              ? 'Loading categories…'
                              : isCategoriesError
                                ? 'Unable to load categories'
                                : 'Select a Category'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryChoices.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                }}
              />
              <FieldError
                message={
                  errors.categoryId?.message ??
                  (isCategoriesError ? getApiErrorMessage(categoriesError) : undefined)
                }
              />
            </div>

            <div className="space-y-2">
              <FormFieldLabel htmlFor="test-instructions" required>
                Test Instructions
              </FormFieldLabel>
              <Controller
                control={control}
                name="primaryInstructionId"
                render={({ field }) => {
                  const instructionChoices = withSelectedOption(
                    instructionOptions,
                    field.value,
                    optionLabels?.instruction,
                  )

                  return (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={isInstructionsLoading || isInstructionsError}
                    >
                      <SelectTrigger
                        id="test-instructions"
                        aria-invalid={
                          errors.primaryInstructionId || isInstructionsError ? true : undefined
                        }
                      >
                        <SelectValue
                          placeholder={
                            isInstructionsLoading
                              ? 'Loading instructions…'
                              : isInstructionsError
                                ? 'Unable to load instructions'
                                : 'Select Instruction'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {instructionChoices.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                }}
              />
              <FieldError
                message={
                  errors.primaryInstructionId?.message ??
                  (isInstructionsError ? getApiErrorMessage(instructionsError) : undefined)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FormFieldLabel
                htmlFor="test-duration"
                required
                hint="Total time allowed to complete the test, in minutes."
              >
                Duration (In Min.)
              </FormFieldLabel>
              <div className="relative">
                <Input
                  id="test-duration"
                  inputMode="numeric"
                  placeholder="0"
                  className="pr-9"
                  aria-invalid={errors.durationMinutes ? true : undefined}
                  {...durationField}
                  onChange={(event) => {
                    event.target.value = keepDigits(event.target.value)
                    void durationField.onChange(event)
                  }}
                />
                <Clock
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <FieldError message={errors.durationMinutes?.message} />
            </div>

            <div className="space-y-2">
              <FormFieldLabel
                htmlFor="test-handicapped-duration"
                hint="Time for candidates with disabilities. Must be more than the actual test duration."
              >
                For Handicapped (In Min.)
              </FormFieldLabel>
              <div className="relative">
                <Input
                  id="test-handicapped-duration"
                  inputMode="numeric"
                  placeholder="0"
                  className="pr-9"
                  aria-invalid={errors.handicappedDurationMinutes ? true : undefined}
                  {...handicappedField}
                  onChange={(event) => {
                    event.target.value = keepDigits(event.target.value)
                    void handicappedField.onChange(event)
                  }}
                />
                <Clock
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <FieldError message={errors.handicappedDurationMinutes?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FormFieldLabel
                htmlFor="test-total-questions"
                required
                hint="Total number of questions that will appear in this test."
              >
                Total Question
              </FormFieldLabel>
              <Input
                id="test-total-questions"
                inputMode="numeric"
                placeholder="0"
                aria-invalid={errors.totalQuestions ? true : undefined}
                {...questionsField}
                onChange={(event) => {
                  event.target.value = keepDigits(event.target.value)
                  void questionsField.onChange(event)
                }}
              />
              <FieldError message={errors.totalQuestions?.message} />
            </div>

            <div className="space-y-2">
              <FormFieldLabel
                htmlFor="test-total-marks"
                required
                hint="Maximum marks a candidate can score in this test."
              >
                Total Marks
              </FormFieldLabel>
              <Input
                id="test-total-marks"
                inputMode="numeric"
                placeholder="0"
                aria-invalid={errors.totalMarks ? true : undefined}
                {...marksField}
                onChange={(event) => {
                  event.target.value = keepDigits(event.target.value)
                  void marksField.onChange(event)
                }}
              />
              <FieldError message={errors.totalMarks?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FormFieldLabel htmlFor="test-passing-marks" hint="Minimum marks required to pass.">
                Passing Marks
              </FormFieldLabel>
              <Input
                id="test-passing-marks"
                inputMode="numeric"
                placeholder="0"
                aria-invalid={errors.passingMarks ? true : undefined}
                {...passingMarksField}
                onChange={(event) => {
                  event.target.value = keepDigits(event.target.value)
                  void passingMarksField.onChange(event)
                }}
              />
              <FieldError message={errors.passingMarks?.message} />
            </div>

            <div className="space-y-2">
              <FormFieldLabel htmlFor="test-grace-marks" hint="Extra marks granted, if any.">
                Grace Marks
              </FormFieldLabel>
              <Input
                id="test-grace-marks"
                inputMode="numeric"
                placeholder="0"
                aria-invalid={errors.graceMarks ? true : undefined}
                {...graceMarksField}
                onChange={(event) => {
                  event.target.value = keepDigits(event.target.value)
                  void graceMarksField.onChange(event)
                }}
              />
              <FieldError message={errors.graceMarks?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FormFieldLabel htmlFor="test-start-date" required>
                Start Date
              </FormFieldLabel>
              <Input
                id="test-start-date"
                type="date"
                max={endDate || undefined}
                aria-invalid={errors.startDate ? true : undefined}
                {...register('startDate')}
              />
              <FieldError message={errors.startDate?.message} />
            </div>

            <div className="space-y-2">
              <FormFieldLabel htmlFor="test-end-date" required>
                End Date
              </FormFieldLabel>
              <Input
                id="test-end-date"
                type="date"
                min={startDate || undefined}
                aria-invalid={errors.endDate ? true : undefined}
                {...register('endDate')}
              />
              <FieldError message={errors.endDate?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FormFieldLabel htmlFor="test-start-time" required>
                Start Time
              </FormFieldLabel>
              <Input
                id="test-start-time"
                type="time"
                max={startTimeMax}
                aria-invalid={errors.startTime ? true : undefined}
                {...register('startTime')}
              />
              <FieldError message={errors.startTime?.message} />
            </div>

            <div className="space-y-2">
              <FormFieldLabel htmlFor="test-end-time" required>
                End Time
              </FormFieldLabel>
              <Input
                id="test-end-time"
                type="time"
                min={endTimeMin}
                aria-invalid={errors.endTime ? true : undefined}
                {...register('endTime')}
              />
              <FieldError message={errors.endTime?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <FormFieldLabel
              htmlFor="test-start-buffer-time"
              hint="Extra time allowed after the official start before the test begins."
            >
              Start Buffer Time
            </FormFieldLabel>
            <Input
              id="test-start-buffer-time"
              placeholder="HH:MM"
              aria-invalid={errors.startBufferTime ? true : undefined}
              {...register('startBufferTime')}
            />
            <FieldError message={errors.startBufferTime?.message} />
          </div>
        </div>

        <Controller
          control={control}
          name="templateId"
          render={({ field }) => (
            <TestTemplatePicker
              value={field.value}
              error={errors.templateId?.message}
              onChange={field.onChange}
            />
          )}
        />
      </form>
    </TooltipProvider>
  )
}

export { STEP_1_FORM_ID }

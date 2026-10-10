export const QUESTION_TYPE_OPTIONS = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'fill_in_the_blanks', label: 'Fill in the Blanks' },
  { value: 'comprehension', label: 'Comprehension' },
] as const

export const FILL_BLANK_ANSWER_TYPE_OPTIONS = [
  { value: 'alphanumeric', label: 'Alphanumeric' },
  { value: 'numeric', label: 'Numeric' },
] as const

export const COMPREHENSION_SUB_QUESTION_TYPES = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'fill_in_the_blanks', label: 'Fill in the Blanks' },
] as const

export const MIN_CHOICE_OPTIONS = 2
export const MAX_CHOICE_OPTIONS = 10

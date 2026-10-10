import type { TestOptionsSettings } from '@/features/test-manager/schema/step-2-settings.schema'

export type TestOptionCheckboxKey = {
  [K in keyof TestOptionsSettings]: TestOptionsSettings[K] extends boolean ? K : never
}[keyof TestOptionsSettings]

export type TestOptionField = {
  kind: 'checkbox'
  key: TestOptionCheckboxKey
  label: string
  hint?: string
}

export const TEST_OPTIONS_LEFT: TestOptionField[] = [
  {
    kind: 'checkbox',
    key: 'isAllQuestionsMandatory',
    label: 'Mandate All Question Attempts',
    hint: 'Candidates must attempt every question before submitting.',
  },
  {
    kind: 'checkbox',
    key: 'showCorrectAnswerAfterAttempt',
    label: 'Show Correct Answer After Attempting a Question',
    hint: 'Show the correct answer immediately after a question is attempted.',
  },
  {
    kind: 'checkbox',
    key: 'enablePartialCredit',
    label: 'Apply Marking Scheme for Partial Credit on Incorrect Answers',
  },
  {
    kind: 'checkbox',
    key: 'enableGenericPlugin',
    label: 'Enable Generic Plugin',
  },
  {
    kind: 'checkbox',
    key: 'showInternetSpeed',
    label: 'Show Internet Speed During Test',
  },
  {
    kind: 'checkbox',
    key: 'enablePartialMarking',
    label: 'Apply Partial Marking',
  },
  {
    kind: 'checkbox',
    key: 'enableScientificCalculator',
    label: 'Show Scientific Calculator',
  },
  {
    kind: 'checkbox',
    key: 'enableActivityLog',
    label: 'Activity Log',
    hint: 'Records candidate activity during the test.',
  },
  {
    kind: 'checkbox',
    key: 'showIncorrectWordsTyped',
    label: 'Show Incorrect Words Typed',
  },
]

export const TEST_OPTIONS_RIGHT: TestOptionField[] = [
  {
    kind: 'checkbox',
    key: 'enableBackspace',
    label: 'Enable Backspace',
  },
  {
    kind: 'checkbox',
    key: 'allowQuestionNavigation',
    label: 'Allow Back and Forward Navigation Between Questions',
    hint: 'Candidates can move freely between questions.',
  },
  {
    kind: 'checkbox',
    key: 'showMarksDuringTest',
    label: 'Show Marks/Points During Test',
    hint: 'Display marks for each question during the test.',
  },
  {
    kind: 'checkbox',
    key: 'enableMultipleLanguages',
    label: 'Support Multiple Languages for Interface Test',
    hint: 'Allow candidates to switch the test interface language.',
  },
  {
    kind: 'checkbox',
    key: 'showQuestionInSingleLine',
    label: 'Show Question in Single Line',
  },
  {
    kind: 'checkbox',
    key: 'showDefaultCalculator',
    label: 'Show Default Calculator',
  },
  {
    kind: 'checkbox',
    key: 'enableOfflineMode',
    label: 'Enable Offline Mode for Mobile Applications',
    hint: 'Allow the test to continue without a live internet connection.',
  },
  {
    kind: 'checkbox',
    key: 'enableSecureBrowser',
    label: 'Secure Browser',
    hint: 'Lock the candidate into a secure browser environment.',
  },
]

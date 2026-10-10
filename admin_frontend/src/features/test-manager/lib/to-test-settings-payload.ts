import {
  emptyTestSettings,
  type ClockFormat,
  type SectionNumbering,
  type TestSettingsData,
  type YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

export type TestSettingsUpdatePayload = {
  groupQuestionsBySubjectArea: boolean
  groupQuestionsByTopic: boolean
  sectionQuestionNumbering: 'by_section' | 'continuous'
  randomizeQuestionOrderWithinTopics: boolean
  randomizeAnswerOptions: boolean
  isAllQuestionsMandatory: boolean
  showCorrectAnswerAfterAttempt: boolean
  enablePartialCredit: boolean
  enableGenericPlugin: boolean
  showInternetSpeed: boolean
  enablePartialMarking: boolean
  enableScientificCalculator: boolean
  enableActivityLog: boolean
  showIncorrectWordsTyped: boolean
  enableBackspace: boolean
  allowQuestionNavigation: boolean
  showMarksDuringTest: boolean
  enableMultipleLanguages: boolean
  showQuestionInSingleLine: boolean
  showDefaultCalculator: boolean
  enableOfflineMode: boolean
  enableSecureBrowser: boolean
  isTestTimeBound: boolean
  clockFormat: 'hh_mm' | 'mm_ss'
  enableSections: boolean
  showPersonalizedMessage: boolean
  passFeedbackMessage: string
  failFeedbackMessage: string
  submissionMessage: string
  enableCandidateFeedback: boolean
}

export type TestSettingsPayload = TestSettingsUpdatePayload & {
  testId: string
}

function toBoolean(value: YesNo) {
  return value === 'yes'
}

function fromBoolean(value: boolean): YesNo {
  return value ? 'yes' : 'no'
}

function toSectionQuestionNumbering(
  value: TestSettingsData['shuffleQuestion']['sectionNumbering'],
): TestSettingsUpdatePayload['sectionQuestionNumbering'] {
  return value === 'by-section' ? 'by_section' : 'continuous'
}

function fromSectionQuestionNumbering(value: unknown): SectionNumbering {
  return value === 'by_section' || value === 'by-section' ? 'by-section' : 'continuous'
}

function toClockFormat(
  value: TestSettingsData['timeSetting']['clockFormat'],
): TestSettingsUpdatePayload['clockFormat'] {
  return value === 'hh-mm' ? 'hh_mm' : 'mm_ss'
}

function fromClockFormat(value: unknown): ClockFormat {
  return value === 'hh_mm' || value === 'hh-mm' ? 'hh-mm' : 'mm-ss'
}

export function toTestSettingsUpdatePayload(settings: TestSettingsData): TestSettingsUpdatePayload {
  const data = {
    ...emptyTestSettings,
    ...settings,
    shuffleQuestion: { ...emptyTestSettings.shuffleQuestion, ...settings.shuffleQuestion },
    testOptions: { ...emptyTestSettings.testOptions, ...settings.testOptions },
    timeSetting: { ...emptyTestSettings.timeSetting, ...settings.timeSetting },
    endTestSetting: { ...emptyTestSettings.endTestSetting, ...settings.endTestSetting },
  }

  return {
    groupQuestionsBySubjectArea: toBoolean(data.shuffleQuestion.groupBySubjectArea),
    groupQuestionsByTopic: toBoolean(data.shuffleQuestion.groupByTopic),
    sectionQuestionNumbering: toSectionQuestionNumbering(data.shuffleQuestion.sectionNumbering),
    randomizeQuestionOrderWithinTopics: toBoolean(data.shuffleQuestion.randomizeQuestionOrder),
    randomizeAnswerOptions: toBoolean(data.shuffleQuestion.randomizeAnswerOptions),
    isAllQuestionsMandatory: data.testOptions.isAllQuestionsMandatory,
    showCorrectAnswerAfterAttempt: data.testOptions.showCorrectAnswerAfterAttempt,
    enablePartialCredit: data.testOptions.enablePartialCredit,
    enableGenericPlugin: data.testOptions.enableGenericPlugin,
    showInternetSpeed: data.testOptions.showInternetSpeed,
    enablePartialMarking: data.testOptions.enablePartialMarking,
    enableScientificCalculator: data.testOptions.enableScientificCalculator,
    enableActivityLog: data.testOptions.enableActivityLog,
    showIncorrectWordsTyped: data.testOptions.showIncorrectWordsTyped,
    enableBackspace: data.testOptions.enableBackspace,
    allowQuestionNavigation: data.testOptions.allowQuestionNavigation,
    showMarksDuringTest: data.testOptions.showMarksDuringTest,
    enableMultipleLanguages: data.testOptions.enableMultipleLanguages,
    showQuestionInSingleLine: data.testOptions.showQuestionInSingleLine,
    showDefaultCalculator: data.testOptions.showDefaultCalculator,
    enableOfflineMode: data.testOptions.enableOfflineMode,
    enableSecureBrowser: data.testOptions.enableSecureBrowser,
    isTestTimeBound: toBoolean(data.timeSetting.displayTimeBound),
    clockFormat: toClockFormat(data.timeSetting.clockFormat),
    enableSections: toBoolean(data.timeSetting.sections),
    showPersonalizedMessage: toBoolean(data.endTestSetting.showPersonalizedMessage),
    passFeedbackMessage: data.endTestSetting.feedbackForPass,
    failFeedbackMessage: data.endTestSetting.feedbackForFail,
    submissionMessage: data.endTestSetting.displayMessageUponSubmission,
    enableCandidateFeedback: toBoolean(data.endTestSetting.provideFeedbackToCandidates),
  }
}

export function toTestSettingsPayload(testId: string, settings: TestSettingsData): TestSettingsPayload {
  return {
    testId,
    ...toTestSettingsUpdatePayload(settings),
  }
}

export function toTestSettingsFormValues(payload: TestSettingsUpdatePayload): TestSettingsData {
  return {
    shuffleQuestion: {
      groupBySubjectArea: fromBoolean(payload.groupQuestionsBySubjectArea),
      groupByTopic: fromBoolean(payload.groupQuestionsByTopic),
      sectionNumbering: fromSectionQuestionNumbering(payload.sectionQuestionNumbering),
      randomizeQuestionOrder: fromBoolean(payload.randomizeQuestionOrderWithinTopics),
      randomizeAnswerOptions: fromBoolean(payload.randomizeAnswerOptions),
    },
    testOptions: {
      isAllQuestionsMandatory: payload.isAllQuestionsMandatory,
      showCorrectAnswerAfterAttempt: payload.showCorrectAnswerAfterAttempt,
      enablePartialCredit: payload.enablePartialCredit,
      enableGenericPlugin: payload.enableGenericPlugin,
      showInternetSpeed: payload.showInternetSpeed,
      enablePartialMarking: payload.enablePartialMarking,
      enableScientificCalculator: payload.enableScientificCalculator,
      enableActivityLog: payload.enableActivityLog,
      showIncorrectWordsTyped: payload.showIncorrectWordsTyped,
      enableBackspace: payload.enableBackspace,
      allowQuestionNavigation: payload.allowQuestionNavigation,
      showMarksDuringTest: payload.showMarksDuringTest,
      enableMultipleLanguages: payload.enableMultipleLanguages,
      showQuestionInSingleLine: payload.showQuestionInSingleLine,
      showDefaultCalculator: payload.showDefaultCalculator,
      enableOfflineMode: payload.enableOfflineMode,
      enableSecureBrowser: payload.enableSecureBrowser,
    },
    timeSetting: {
      displayTimeBound: fromBoolean(payload.isTestTimeBound),
      clockFormat: fromClockFormat(payload.clockFormat),
      sections: fromBoolean(payload.enableSections),
    },
    endTestSetting: {
      showPersonalizedMessage: fromBoolean(payload.showPersonalizedMessage),
      feedbackForPass: payload.passFeedbackMessage,
      feedbackForFail: payload.failFeedbackMessage,
      displayMessageUponSubmission: payload.submissionMessage,
      provideFeedbackToCandidates: fromBoolean(payload.enableCandidateFeedback),
    },
  }
}

export function areTestSettingsUpdatePayloadsEqual(
  left: TestSettingsUpdatePayload,
  right: TestSettingsUpdatePayload,
) {
  return JSON.stringify(left) === JSON.stringify(right)
}

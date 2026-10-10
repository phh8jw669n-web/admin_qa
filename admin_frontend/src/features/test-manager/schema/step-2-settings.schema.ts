export type YesNo = 'yes' | 'no'
export type SectionNumbering = 'by-section' | 'continuous'

export type ShuffleQuestionSettings = {
  groupBySubjectArea: YesNo
  groupByTopic: YesNo
  sectionNumbering: SectionNumbering
  randomizeQuestionOrder: YesNo
  randomizeAnswerOptions: YesNo
}

export type TestOptionsSettings = {
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
}

export type ClockFormat = 'hh-mm' | 'mm-ss'

export type TimeSettingSettings = {
  displayTimeBound: YesNo
  clockFormat: ClockFormat
  sections: YesNo
}

export type EndTestSettingSettings = {
  showPersonalizedMessage: YesNo
  feedbackForPass: string
  feedbackForFail: string
  displayMessageUponSubmission: string
  provideFeedbackToCandidates: YesNo
}

export type GenerateRankMode = 'automatic' | 'manual'

export type GenerateRankSettings = {
  calculateRanks: GenerateRankMode
  allowDuplicateRanks: YesNo
  skipRankAfterDuplicate: YesNo
}

export type TestAttemptResumeSettings = {
  allowMultipleAttempt: YesNo
  maximumAttempts: string
  enableTestResumption: YesNo
  maximumResumptions: string
  provideFullScreenMode: YesNo
}

export type BioBreakSettingSettings = {
  allowBioBreak: YesNo
}

export type ReportSettingSettings = {
  instantResult: YesNo
  showDetailedPerformanceReports: YesNo
  treatNegativeScoresAsZero: YesNo
}

export type StreamRecordingMode = 'camera' | 'screen'

export type ProctoringSettingSettings = {
  enableProctorMonitoring: YesNo
  streamRecordingMode: StreamRecordingMode
  captureCameraRecording: YesNo
  enableMic: YesNo
  enableLocation: YesNo
  fnpCountTermination: string
  faceRecognition: YesNo
  enableUnfairMeansDetection: YesNo
  useCredibilityScore: YesNo
  minimumCredibilityScore: string
  makeCredibilityScoreVisible: YesNo
  allowProctorToSuspendTests: YesNo
  escalationMatrix: YesNo
  candidateInitiateChat: YesNo
  ufmMatrix: YesNo
  manualProctoringAutomaticCompatibility: YesNo
}

export type CandidateAuthenticationSettings = {
  skipAuthentication: YesNo
  enableUfmWarningMessages: YesNo
}

export type WhitelistedWebsiteSettings = {
  enableWhitelistedWebsite: YesNo
}

export type CbtDataSecuritySettings = {
  testDownloadPassword: string
  enableRegistration: YesNo
}

export type TestSettingsData = {
  shuffleQuestion: ShuffleQuestionSettings
  testOptions: TestOptionsSettings
  timeSetting: TimeSettingSettings
  endTestSetting: EndTestSettingSettings
}

export const emptyShuffleQuestionSettings: ShuffleQuestionSettings = {
  groupBySubjectArea: 'no',
  groupByTopic: 'no',
  sectionNumbering: 'continuous',
  randomizeQuestionOrder: 'no',
  randomizeAnswerOptions: 'no',
}

export const emptyTestOptionsSettings: TestOptionsSettings = {
  isAllQuestionsMandatory: false,
  showCorrectAnswerAfterAttempt: false,
  enablePartialCredit: false,
  enableGenericPlugin: false,
  showInternetSpeed: false,
  enablePartialMarking: false,
  enableScientificCalculator: false,
  enableActivityLog: false,
  showIncorrectWordsTyped: false,
  enableBackspace: false,
  allowQuestionNavigation: false,
  showMarksDuringTest: false,
  enableMultipleLanguages: false,
  showQuestionInSingleLine: false,
  showDefaultCalculator: false,
  enableOfflineMode: false,
  enableSecureBrowser: false,
}

export const emptyTimeSettingSettings: TimeSettingSettings = {
  displayTimeBound: 'yes',
  clockFormat: 'mm-ss',
  sections: 'no',
}

export const emptyEndTestSettingSettings: EndTestSettingSettings = {
  showPersonalizedMessage: 'yes',
  feedbackForPass: '',
  feedbackForFail: '',
  displayMessageUponSubmission: '',
  provideFeedbackToCandidates: 'no',
}

export const emptyGenerateRankSettings: GenerateRankSettings = {
  calculateRanks: 'automatic',
  allowDuplicateRanks: 'no',
  skipRankAfterDuplicate: 'no',
}

export const emptyTestAttemptResumeSettings: TestAttemptResumeSettings = {
  allowMultipleAttempt: 'no',
  maximumAttempts: '0',
  enableTestResumption: 'no',
  maximumResumptions: '0',
  provideFullScreenMode: 'no',
}

export const emptyBioBreakSettingSettings: BioBreakSettingSettings = {
  allowBioBreak: 'no',
}

export const emptyReportSettingSettings: ReportSettingSettings = {
  instantResult: 'yes',
  showDetailedPerformanceReports: 'no',
  treatNegativeScoresAsZero: 'no',
}

export const emptyProctoringSettingSettings: ProctoringSettingSettings = {
  enableProctorMonitoring: 'no',
  streamRecordingMode: 'screen',
  captureCameraRecording: 'no',
  enableMic: 'no',
  enableLocation: 'no',
  fnpCountTermination: '5',
  faceRecognition: 'no',
  enableUnfairMeansDetection: 'no',
  useCredibilityScore: 'no',
  minimumCredibilityScore: '0',
  makeCredibilityScoreVisible: 'no',
  allowProctorToSuspendTests: 'no',
  escalationMatrix: 'no',
  candidateInitiateChat: 'no',
  ufmMatrix: 'no',
  manualProctoringAutomaticCompatibility: 'no',
}

export const emptyCandidateAuthenticationSettings: CandidateAuthenticationSettings = {
  skipAuthentication: 'no',
  enableUfmWarningMessages: 'no',
}

export const emptyWhitelistedWebsiteSettings: WhitelistedWebsiteSettings = {
  enableWhitelistedWebsite: 'no',
}

export const emptyCbtDataSecuritySettings: CbtDataSecuritySettings = {
  testDownloadPassword: '',
  enableRegistration: 'no',
}

export const emptyTestSettings: TestSettingsData = {
  shuffleQuestion: emptyShuffleQuestionSettings,
  testOptions: emptyTestOptionsSettings,
  timeSetting: emptyTimeSettingSettings,
  endTestSetting: emptyEndTestSettingSettings,
}

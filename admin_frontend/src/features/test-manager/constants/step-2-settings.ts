export type TestSettingId =
  | 'shuffle-question'
  | 'test-options'
  | 'time-setting'
  | 'end-test-setting'

export type TestSettingItem = {
  id: TestSettingId
  label: string
}

export const TEST_SETTINGS: TestSettingItem[] = [
  { id: 'shuffle-question', label: 'Shuffle Question' },
  { id: 'test-options', label: 'Test Options' },
  { id: 'time-setting', label: 'Time Setting' },
  { id: 'end-test-setting', label: 'End Test Setting' },
]

import { SettingNumberRow } from '@/features/test-manager/components/setting-number-row'
import { SettingRadioRow } from '@/features/test-manager/components/setting-radio-row'
import type {
  TestAttemptResumeSettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

type TestAttemptResumePanelProps = {
  value: TestAttemptResumeSettings
  onChange: (value: TestAttemptResumeSettings) => void
}

export function TestAttemptResumePanel({ value, onChange }: TestAttemptResumePanelProps) {
  const update = <K extends keyof TestAttemptResumeSettings>(
    field: K,
    next: TestAttemptResumeSettings[K],
  ) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="divide-y divide-border">
        <div className="space-y-2 py-2 first:pt-0">
          <SettingRadioRow
            name="allow-multiple-attempt"
            label="Allow Multiple Attempt"
            description="Multiple Attempt"
            value={value.allowMultipleAttempt}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('allowMultipleAttempt', next)}
          />

          {value.allowMultipleAttempt === 'yes' ? (
            <SettingNumberRow
              id="maximum-attempts"
              label="Maximum Attempts"
              value={value.maximumAttempts}
              onChange={(next) => update('maximumAttempts', next)}
            />
          ) : null}
        </div>

        <div className="space-y-2 py-2">
          <SettingRadioRow
            name="enable-test-resumption"
            label="Enable Test Resumption After Stopping"
            description="Candidates can resume test up to a certain number of times"
            value={value.enableTestResumption}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('enableTestResumption', next)}
          />

          {value.enableTestResumption === 'yes' ? (
            <SettingNumberRow
              id="maximum-resumptions"
              label="Maximum Resumptions"
              value={value.maximumResumptions}
              onChange={(next) => update('maximumResumptions', next)}
            />
          ) : null}
        </div>

        <div className="py-2 last:pb-0">
          <SettingRadioRow
            name="provide-full-screen-mode"
            label="Provide Full-Screen Mode Option During Test"
            description="Full Screen Mode"
            value={value.provideFullScreenMode}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('provideFullScreenMode', next)}
          />
        </div>
      </div>
    </div>
  )
}

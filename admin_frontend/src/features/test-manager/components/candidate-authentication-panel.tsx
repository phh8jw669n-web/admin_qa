import { SettingRadioRow } from '@/features/test-manager/components/setting-radio-row'
import type {
  CandidateAuthenticationSettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

type CandidateAuthenticationPanelProps = {
  value: CandidateAuthenticationSettings
  onChange: (value: CandidateAuthenticationSettings) => void
}

export function CandidateAuthenticationPanel({
  value,
  onChange,
}: CandidateAuthenticationPanelProps) {
  const update = <K extends keyof CandidateAuthenticationSettings>(
    field: K,
    next: CandidateAuthenticationSettings[K],
  ) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div className="space-y-3 px-3 py-3">
      <p className="text-xs text-muted-foreground">
        You can set or skip candidates authentication
      </p>

      <div className="divide-y divide-border">
        <div className="py-2 first:pt-0">
          <SettingRadioRow
            name="skip-authentication"
            label="Skip Authentication"
            description="Allow Skipping Authentication for Each Test"
            hint="Candidates can skip identity verification for this test."
            value={value.skipAuthentication}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('skipAuthentication', next)}
          />
        </div>

        <div className="py-2 last:pb-0">
          <SettingRadioRow
            name="enable-ufm-warning-messages"
            label="Warning Messages"
            description="Enable UFM Warning Messages"
            hint="Show unfair-means warning messages to candidates during the test."
            value={value.enableUfmWarningMessages}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('enableUfmWarningMessages', next)}
          />
        </div>
      </div>
    </div>
  )
}

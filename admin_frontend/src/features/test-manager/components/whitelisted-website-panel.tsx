import { SettingRadioRow } from '@/features/test-manager/components/setting-radio-row'
import type {
  WhitelistedWebsiteSettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

type WhitelistedWebsitePanelProps = {
  value: WhitelistedWebsiteSettings
  onChange: (value: WhitelistedWebsiteSettings) => void
}

export function WhitelistedWebsitePanel({ value, onChange }: WhitelistedWebsitePanelProps) {
  return (
    <div className="space-y-3 px-3 py-3">
      <div className="divide-y divide-border">
        <div className="py-2 first:pt-0 last:pb-0">
          <SettingRadioRow
            name="enable-whitelisted-website"
            label="Whitelisted Website"
            description="Enable Whitelisted Website of test by a candidate"
            value={value.enableWhitelistedWebsite}
            options={YES_NO_OPTIONS}
            onChange={(next) => onChange({ ...value, enableWhitelistedWebsite: next })}
          />
        </div>
      </div>
    </div>
  )
}

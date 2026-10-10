import { SettingRadioRow } from '@/features/test-manager/components/setting-radio-row'
import type {
  BioBreakSettingSettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

type BioBreakSettingPanelProps = {
  value: BioBreakSettingSettings
  onChange: (value: BioBreakSettingSettings) => void
}

export function BioBreakSettingPanel({ value, onChange }: BioBreakSettingPanelProps) {
  return (
    <div className="space-y-3 px-3 py-3">
      <p className="text-xs text-muted-foreground">Set Candidate Bio Break</p>

      <div className="divide-y divide-border">
        <div className="py-2 first:pt-0 last:pb-0">
          <SettingRadioRow
            name="allow-bio-break"
            label="Allow Breaks for Biological Needs"
            description="Bio Break"
            value={value.allowBioBreak}
            options={YES_NO_OPTIONS}
            onChange={(next) => onChange({ ...value, allowBioBreak: next })}
          />
        </div>
      </div>
    </div>
  )
}

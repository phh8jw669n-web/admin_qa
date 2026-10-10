import { SettingRadioGroup } from '@/features/test-manager/components/setting-radio-row'
import {
  settingTableCategoryClass,
  settingTableControlClass,
  settingTableFieldClass,
} from '@/features/test-manager/components/setting-control'
import type {
  ClockFormat,
  TimeSettingSettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

const CLOCK_FORMAT_OPTIONS: Array<{ value: ClockFormat; label: string }> = [
  { value: 'hh-mm', label: 'hh:mm' },
  { value: 'mm-ss', label: 'mm:ss' },
]

type TimeSettingPanelProps = {
  value: TimeSettingSettings
  onChange: (value: TimeSettingSettings) => void
}

export function TimeSettingPanel({ value, onChange }: TimeSettingPanelProps) {
  const update = <K extends keyof TimeSettingSettings>(field: K, next: TimeSettingSettings[K]) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div>
      <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Amend the clock settings for a test
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={settingTableCategoryClass}>Display Time Bound for Entire Test</td>
              <td className={settingTableFieldClass}>
                The Candidate has to finish the test in between the allocated time frame
              </td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="display-time-bound"
                  label="Display Time Bound for Entire Test"
                  value={value.displayTimeBound}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('displayTimeBound', next)}
                />
              </td>
            </tr>
            <tr>
              <td className={settingTableCategoryClass}>Choose Clock Format</td>
              <td className={settingTableFieldClass}>Select Clock Format</td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="clock-format"
                  label="Choose Clock Format"
                  value={value.clockFormat}
                  options={CLOCK_FORMAT_OPTIONS}
                  onChange={(next) => update('clockFormat', next)}
                />
              </td>
            </tr>
            <tr>
              <td className={settingTableCategoryClass}>Sections</td>
              <td className={settingTableFieldClass}>
                In order to set up sections according to your exam
              </td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="time-sections"
                  label="Sections"
                  value={value.sections}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('sections', next)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { SettingRadioRow } from '@/features/test-manager/components/setting-radio-row'
import type {
  ReportSettingSettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

type ReportSettingPanelProps = {
  value: ReportSettingSettings
  onChange: (value: ReportSettingSettings) => void
}

export function ReportSettingPanel({ value, onChange }: ReportSettingPanelProps) {
  const update = <K extends keyof ReportSettingSettings>(
    field: K,
    next: ReportSettingSettings[K],
  ) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div className="space-y-3 px-3 py-3">
      <p className="text-xs font-medium text-foreground">Test Taker Report</p>

      <div className="divide-y divide-border">
        <div className="py-2 first:pt-0">
          <SettingRadioRow
            name="instant-result"
            label="Instant Result"
            hint="Show the result immediately after the candidate submits the test."
            value={value.instantResult}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('instantResult', next)}
          />
        </div>

        <div className="py-2">
          <SettingRadioRow
            name="show-detailed-performance-reports"
            label="Show Detailed Performance Reports"
            value={value.showDetailedPerformanceReports}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('showDetailedPerformanceReports', next)}
          />
        </div>

        <div className="py-2 last:pb-0">
          <SettingRadioRow
            name="treat-negative-scores-as-zero"
            label="Treat Negative Scores as Zero"
            value={value.treatNegativeScoresAsZero}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('treatNegativeScoresAsZero', next)}
          />
        </div>
      </div>
    </div>
  )
}

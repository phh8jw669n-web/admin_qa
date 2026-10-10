import { Input } from '@/components/ui/input'
import { SettingRadioRow } from '@/features/test-manager/components/setting-radio-row'
import type {
  CbtDataSecuritySettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

type CbtDataSecurityPanelProps = {
  value: CbtDataSecuritySettings
  onChange: (value: CbtDataSecuritySettings) => void
}

export function CbtDataSecurityPanel({ value, onChange }: CbtDataSecurityPanelProps) {
  const update = <K extends keyof CbtDataSecuritySettings>(
    field: K,
    next: CbtDataSecuritySettings[K],
  ) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="divide-y divide-border">
        <div className="py-2 first:pt-0">
          <div className="flex items-center gap-3">
            <label
              htmlFor="test-download-password"
              className="w-[13rem] shrink-0 text-xs font-medium text-foreground"
            >
              Test Download Password
            </label>
            <Input
              id="test-download-password"
              type="password"
              autoComplete="new-password"
              value={value.testDownloadPassword}
              onChange={(event) => update('testDownloadPassword', event.target.value)}
              className="h-7 max-w-sm flex-1 text-xs shadow-none"
            />
          </div>
        </div>

        <div className="py-2 last:pb-0">
          <SettingRadioRow
            name="enable-registration"
            label="Enable Registration"
            description="Registration before test start"
            value={value.enableRegistration}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('enableRegistration', next)}
          />
        </div>
      </div>
    </div>
  )
}

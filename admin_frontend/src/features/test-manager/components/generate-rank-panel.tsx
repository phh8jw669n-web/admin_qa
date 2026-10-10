import { SettingRadioGroup } from '@/features/test-manager/components/setting-radio-row'
import {
  settingTableCategoryClass,
  settingTableControlClass,
  settingTableFieldClass,
} from '@/features/test-manager/components/setting-control'
import type {
  GenerateRankMode,
  GenerateRankSettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

const RANK_MODE_OPTIONS: Array<{ value: GenerateRankMode; label: string }> = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
]

type GenerateRankPanelProps = {
  value: GenerateRankSettings
  onChange: (value: GenerateRankSettings) => void
}

export function GenerateRankPanel({ value, onChange }: GenerateRankPanelProps) {
  const update = <K extends keyof GenerateRankSettings>(
    field: K,
    next: GenerateRankSettings[K],
  ) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div>
      <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        To produce the position of the candidates appearing in a test
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={settingTableCategoryClass}>Generate Rank</td>
              <td className={settingTableFieldClass}>Calculate Ranks</td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="calculate-ranks"
                  label="Calculate Ranks"
                  value={value.calculateRanks}
                  options={RANK_MODE_OPTIONS}
                  onChange={(next) => update('calculateRanks', next)}
                />
              </td>
            </tr>
            <tr>
              <td rowSpan={2} className={settingTableCategoryClass}>
                Rank Evaluation
              </td>
              <td className={settingTableFieldClass}>Allow/Disallow Duplicate Ranks</td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="allow-duplicate-ranks"
                  label="Allow/Disallow Duplicate Ranks"
                  value={value.allowDuplicateRanks}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('allowDuplicateRanks', next)}
                />
              </td>
            </tr>
            <tr>
              <td className={settingTableFieldClass}>Skip Rank After Duplicate</td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="skip-rank-after-duplicate"
                  label="Skip Rank After Duplicate"
                  value={value.skipRankAfterDuplicate}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('skipRankAfterDuplicate', next)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

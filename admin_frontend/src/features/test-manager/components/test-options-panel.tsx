import { SettingCheckboxRow } from '@/features/test-manager/components/setting-checkbox-row'
import {
  TEST_OPTIONS_LEFT,
  TEST_OPTIONS_RIGHT,
  type TestOptionField,
} from '@/features/test-manager/constants/test-options-fields'
import type { TestOptionsSettings } from '@/features/test-manager/schema/step-2-settings.schema'

type TestOptionsPanelProps = {
  value: TestOptionsSettings
  onChange: (value: TestOptionsSettings) => void
}

function OptionFields({
  fields,
  value,
  onChange,
}: {
  fields: TestOptionField[]
  value: TestOptionsSettings
  onChange: (value: TestOptionsSettings) => void
}) {
  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <SettingCheckboxRow
          key={field.key}
          id={`test-option-${field.key}`}
          label={field.label}
          hint={field.hint}
          checked={value[field.key]}
          onChange={(checked) => onChange({ ...value, [field.key]: checked })}
        />
      ))}
    </div>
  )
}

export function TestOptionsPanel({ value, onChange }: TestOptionsPanelProps) {
  return (
    <div className="space-y-4 px-3 py-3">
      <p className="text-xs text-muted-foreground">
        Set the required fields for a candidate appearing in the test
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <OptionFields fields={TEST_OPTIONS_LEFT} value={value} onChange={onChange} />
        <OptionFields fields={TEST_OPTIONS_RIGHT} value={value} onChange={onChange} />
      </div>
    </div>
  )
}

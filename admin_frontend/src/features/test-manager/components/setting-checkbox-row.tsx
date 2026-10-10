import { SettingLabel } from '@/features/test-manager/components/setting-hint'
import { cn } from '@/lib/utils'

type SettingCheckboxRowProps = {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SettingCheckboxRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: SettingCheckboxRowProps) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={cn(
          'mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm border border-input accent-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      />
      <SettingLabel htmlFor={id} hint={hint}>
        {label}
      </SettingLabel>
    </div>
  )
}

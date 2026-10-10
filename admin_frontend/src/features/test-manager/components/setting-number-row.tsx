import { Input } from '@/components/ui/input'
import { SETTING_CONTROL_CLASS } from '@/features/test-manager/components/setting-control'
import { SettingLabel } from '@/features/test-manager/components/setting-hint'
import { cn } from '@/lib/utils'

type SettingNumberRowProps = {
  id: string
  label: string
  hint?: string
  description?: string
  value: string
  onChange: (value: string) => void
}

export function SettingNumberRow({
  id,
  label,
  hint,
  description,
  value,
  onChange,
}: SettingNumberRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {description ? (
        <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-center sm:gap-4">
          <SettingLabel htmlFor={id} hint={hint}>
            {label}
          </SettingLabel>
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:mt-0">{description}</p>
        </div>
      ) : (
        <SettingLabel htmlFor={id} hint={hint}>
          {label}
        </SettingLabel>
      )}
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        className={cn(SETTING_CONTROL_CLASS, 'h-8 px-2 text-center text-xs shadow-none')}
      />
    </div>
  )
}

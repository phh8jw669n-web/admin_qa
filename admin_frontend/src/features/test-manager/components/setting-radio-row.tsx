import { SETTING_CONTROL_CLASS } from '@/features/test-manager/components/setting-control'
import { SettingHint } from '@/features/test-manager/components/setting-hint'
import { cn } from '@/lib/utils'

type SettingRadioOption<T extends string> = {
  value: T
  label: string
}

type SettingRadioGroupProps<T extends string> = {
  name: string
  label: string
  value: T
  options: SettingRadioOption<T>[]
  onChange: (value: T) => void
}

export function SettingRadioGroup<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: SettingRadioGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(SETTING_CONTROL_CLASS, 'ml-auto grid justify-items-start gap-x-4 gap-y-1')}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const id = `${name}-${option.value}`
        const checked = value === option.value

        return (
          <label
            key={option.value}
            htmlFor={id}
            className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 text-xs text-foreground"
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-primary"
            />
            <span className="truncate">{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}

type SettingRadioRowProps<T extends string> = {
  name: string
  label: string
  description?: string
  hint?: string
  value: T
  options: SettingRadioOption<T>[]
  onChange: (value: T) => void
}

export function SettingRadioRow<T extends string>({
  name,
  label,
  description,
  hint,
  value,
  options,
  onChange,
}: SettingRadioRowProps<T>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-center sm:gap-4">
        <p className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
          {label}
          {hint ? <SettingHint hint={hint} /> : null}
        </p>
        {description ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:mt-0">{description}</p>
        ) : null}
      </div>
      <SettingRadioGroup
        name={name}
        label={label}
        value={value}
        options={options}
        onChange={onChange}
      />
    </div>
  )
}

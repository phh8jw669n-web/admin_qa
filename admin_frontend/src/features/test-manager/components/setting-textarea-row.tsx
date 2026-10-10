import { SettingLabel } from '@/features/test-manager/components/setting-hint'
import { cn } from '@/lib/utils'

type SettingTextareaRowProps = {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  rows?: number
}

export function SettingTextareaRow({
  id,
  label,
  hint,
  value,
  onChange,
  rows = 3,
}: SettingTextareaRowProps) {
  return (
    <div className="space-y-1.5">
      <SettingLabel htmlFor={id} hint={hint}>
        {label}
      </SettingLabel>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'flex min-h-[4.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      />
    </div>
  )
}

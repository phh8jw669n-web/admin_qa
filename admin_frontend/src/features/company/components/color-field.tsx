import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/features/company/components/field-label'
import { cn } from '@/lib/utils'

type ColorFieldProps = {
  id: string
  label: string
  value: string
  fallback: string
  required?: boolean
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
}

function normalizeHexColor(value: string, fallback: string) {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  const shortHex = /^#[0-9a-fA-F]{3}$/
  const longHex = /^#[0-9a-fA-F]{6}$/

  if (longHex.test(withHash)) {
    return withHash.toLowerCase()
  }

  if (shortHex.test(withHash)) {
    const [, r, g, b] = withHash
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }

  return fallback.toLowerCase()
}

export function isValidHexColor(value: string) {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  return /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(withHash)
}

export function ColorField({
  id,
  label,
  value,
  fallback,
  required,
  disabled,
  error,
  onChange,
}: ColorFieldProps) {
  const previewColor = normalizeHexColor(value, fallback)

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <div className="flex items-center gap-2">
        <label
          htmlFor={`${id}-picker`}
          className={cn(
            'relative h-10 w-12 shrink-0 overflow-hidden rounded-md border border-border',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
          style={{ backgroundColor: previewColor }}
          title={previewColor}
        >
          <input
            id={`${id}-picker`}
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={previewColor}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
        </label>
        <Input
          id={id}
          placeholder={fallback}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldLabel } from '@/features/company/components/field-label'

type StatusFieldProps = {
  id: string
  value: string
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
}

export function StatusField({ id, value, disabled, error, onChange }: StatusFieldProps) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} required>
        Status
      </FieldLabel>
      <Select value={value || 'active'} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={error ? true : undefined}>
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

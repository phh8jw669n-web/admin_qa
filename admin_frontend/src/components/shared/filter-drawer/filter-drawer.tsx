import { ListFilter, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { FilterDrawerProps, FilterFieldConfig, FilterOption } from './types'

const ALL_VALUE = '__all__'

function countActiveFilters(values: Record<string, string>) {
  return Object.values(values).filter((value) => value.trim() !== '').length
}

function trimValues<T extends Record<string, string>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.trim()]),
  ) as T
}

type FilterSelectProps = {
  id: string
  value: string
  placeholder: string
  options: FilterOption[]
  disabled?: boolean
  onValueChange: (value: string) => void
}

function FilterSelect({
  id,
  value,
  placeholder,
  options,
  disabled,
  onValueChange,
}: FilterSelectProps) {
  return (
    <Select
      value={value || ALL_VALUE}
      onValueChange={(next) => onValueChange(next === ALL_VALUE ? '' : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="h-9 w-full bg-background">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FilterField({
  field,
  value,
  onChange,
  onSubmit,
}: {
  field: FilterFieldConfig
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const fieldId = `filter-${field.key}`

  return (
    <div className="space-y-2 p-1">
      <Label htmlFor={fieldId}>{field.label}</Label>
      {field.type === 'text' ? (
        <Input
          id={fieldId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit()
          }}
          placeholder={field.placeholder}
        />
      ) : (
        <FilterSelect
          id={fieldId}
          value={value}
          placeholder={field.placeholder ?? 'All'}
          options={field.options}
          disabled={field.disabled}
          onValueChange={onChange}
        />
      )}
    </div>
  )
}

export function FilterDrawer<T extends Record<string, string>>({
  fields,
  value,
  defaultValue,
  onApply,
  actions,
  title = 'Filters',
  description = 'Set filters and apply them to the list.',
}: FilterDrawerProps<T>) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<T>(value)
  const activeCount = countActiveFilters(value)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDraft(value)
    setOpen(nextOpen)
  }

  const handleApply = () => {
    onApply(trimValues(draft))
    setOpen(false)
  }

  const handleReset = () => {
    setDraft(defaultValue)
    onApply(defaultValue)
    setOpen(false)
  }

  return (
    <div className="filter-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-card shadow-sm"
          onClick={() => handleOpenChange(true)}
        >
          <ListFilter />
          Filters
          {activeCount > 0 && (
            <Badge variant="default" className="h-5 min-w-5 justify-center px-1.5">
              {activeCount}
            </Badge>
          )}
        </Button>

        {activeCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/30 bg-destructive/5 text-destructive shadow-sm hover:bg-destructive/10 hover:text-destructive"
            onClick={handleReset}
          >
            <RotateCcw />
            Reset filters
          </Button>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full overflow-hidden sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1">
              {fields.map((field) => (
                <FilterField
                  key={field.key}
                  field={field}
                  value={draft[field.key] ?? ''}
                  onChange={(next) =>
                    setDraft((current) => ({ ...current, [field.key]: next }))
                  }
                  onSubmit={handleApply}
                />
              ))}
            </div>

            <div className="mt-auto flex gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleReset}
              >
                <RotateCcw />
                Reset
              </Button>
              <Button type="button" className="flex-1" onClick={handleApply}>
                Apply filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export type { FilterDrawerProps, FilterFieldConfig, FilterOption } from './types'

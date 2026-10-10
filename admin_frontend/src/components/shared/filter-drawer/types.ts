import type { ReactNode } from 'react'

export type FilterOption = {
  value: string
  label: string
}

export type FilterFieldConfig =
  | {
      type: 'text'
      key: string
      label: string
      placeholder?: string
    }
  | {
      type: 'select'
      key: string
      label: string
      placeholder?: string
      options: FilterOption[]
      disabled?: boolean
    }

export type FilterDrawerProps<T extends Record<string, string>> = {
  fields: FilterFieldConfig[]
  value: T
  defaultValue: T
  onApply: (values: T) => void
  actions?: ReactNode
  title?: string
  description?: string
}

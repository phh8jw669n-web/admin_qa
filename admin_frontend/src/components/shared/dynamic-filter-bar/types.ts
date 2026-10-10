export type FilterField =
  | { type: 'text'; key: string; label: string }
  | { type: 'select'; key: string; label: string; options: { label: string; value: string }[] }
  | { type: 'date-range'; key: string; label: string }

export type FilterCriterion = {
  value: string
  label: string
  field: FilterField
}

export type DynamicFilterBarProps = {
  criteria: FilterCriterion[]
  onSearch: (filterKey: string, value: unknown) => void
}

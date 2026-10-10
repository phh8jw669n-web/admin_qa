import { useMemo } from 'react'
import type { ReactNode } from 'react'

import { FilterDrawer } from '@/components/shared/filter-drawer/filter-drawer'
import type { FilterFieldConfig } from '@/components/shared/filter-drawer/types'
import { useCategories } from '@/features/test-manager/api/use-categories'
import { useTemplates } from '@/features/test-manager/api/use-templates'
import {
  defaultTestListFilters,
  type TestListFilters,
} from '@/features/test-manager/types'

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

type TestListFilterBarProps = {
  value: TestListFilters
  onSearch: (filters: TestListFilters) => void
  actions?: ReactNode
}

export function TestListFilterBar({ value, onSearch, actions }: TestListFilterBarProps) {
  const { data: categoryOptions = [], isLoading: isCategoriesLoading } = useCategories()
  const { data: templates = [], isLoading: isTemplatesLoading } = useTemplates()

  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      { type: 'text', key: 'name', label: 'Name', placeholder: 'Search by name' },
      { type: 'text', key: 'testCode', label: 'Test code', placeholder: 'Search by test code' },
      {
        type: 'select',
        key: 'categoryId',
        label: 'Category',
        placeholder: 'All categories',
        options: categoryOptions,
        disabled: isCategoriesLoading,
      },
      {
        type: 'select',
        key: 'templateId',
        label: 'Template',
        placeholder: 'All templates',
        options: templates.map((template) => ({ value: template.id, label: template.name })),
        disabled: isTemplatesLoading,
      },
      {
        type: 'select',
        key: 'isDraft',
        label: 'Draft',
        placeholder: 'All',
        options: BOOLEAN_OPTIONS,
      },
      {
        type: 'select',
        key: 'isPublished',
        label: 'Published',
        placeholder: 'All',
        options: BOOLEAN_OPTIONS,
      },
      {
        type: 'select',
        key: 'isActive',
        label: 'Active',
        placeholder: 'All',
        options: BOOLEAN_OPTIONS,
      },
    ],
    [categoryOptions, isCategoriesLoading, isTemplatesLoading, templates],
  )

  return (
    <FilterDrawer
      title="Filters"
      description="Set filters and apply them to the tests list."
      fields={fields}
      value={value}
      defaultValue={defaultTestListFilters}
      onApply={onSearch}
      actions={actions}
    />
  )
}

import { DynamicFilterBar } from '@/components/shared/dynamic-filter-bar/dynamic-filter-bar'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const filterCriteria = [
  {
    value: 'category',
    label: 'Category',
    field: { type: 'text' as const, key: 'category', label: 'Category' },
  },
  {
    value: 'level',
    label: 'Level',
    field: {
      type: 'select' as const,
      key: 'level',
      label: 'Level',
      options: [
        { label: 'Level 1', value: '1' },
        { label: 'Level 2', value: '2' },
        { label: 'Level 3', value: '3' },
        { label: 'Level 4', value: '4' },
      ],
    },
  },
]

export function CategoryManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Management"
        description="4-level category tree and subject hierarchy."
      />

      <DynamicFilterBar criteria={filterCriteria} onSearch={() => undefined} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Tree</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tree table scaffold — configure DataTable with <code>enableExpanding</code> and{' '}
          <code>getSubRows</code>.
        </CardContent>
      </Card>
    </div>
  )
}

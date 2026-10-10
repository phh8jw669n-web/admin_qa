import { DynamicFilterBar } from '@/components/shared/dynamic-filter-bar/dynamic-filter-bar'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const filterCriteria = [
  {
    value: 'subject',
    label: 'Subject',
    field: { type: 'text' as const, key: 'subject', label: 'Subject' },
  },
  {
    value: 'difficulty',
    label: 'Difficulty',
    field: {
      type: 'select' as const,
      key: 'difficulty',
      label: 'Difficulty',
      options: [
        { label: 'Easy', value: 'easy' },
        { label: 'Medium', value: 'medium' },
        { label: 'Hard', value: 'hard' },
      ],
    },
  },
]

export function QuestionBankPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Question Bank" description="Subjects, imports, and question inventory." />

      <DynamicFilterBar criteria={filterCriteria} onSearch={() => undefined} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Subject management table scaffold — reuse DataTable with tree expansion.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Import history table scaffold — reuse DynamicFilterBar + DataTable.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

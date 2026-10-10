import { Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { QuestionListItem } from '@/features/test-manager/api/fetch-questions'
import { QUESTION_TYPE_OPTIONS } from '@/features/test-manager/constants/step-3-questions'

type QuestionListProps = {
  items: QuestionListItem[]
  subjectLabels: Map<string, string>
  topicLabels: Map<string, string>
  totalQuestions?: number
  canAdd: boolean
  onAdd: () => void
  onSelect: (id: string) => void
}

function questionTypeLabel(type: string) {
  return QUESTION_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
}

export function QuestionList({
  items,
  subjectLabels,
  topicLabels,
  totalQuestions = 0,
  canAdd,
  onAdd,
  onSelect,
}: QuestionListProps) {
  return (
    <div className="-mx-6 -mt-6 min-h-[36rem] rounded-t-md border-b border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Questions</h2>
          <p className="text-xs text-muted-foreground">
            {items.length}
            {totalQuestions > 0 ? ` of ${totalQuestions}` : ''} question
            {items.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button type="button" size="sm" onClick={onAdd} disabled={!canAdd}>
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[20rem] items-center justify-center px-4">
          <p className="text-center text-sm text-muted-foreground">
            No questions yet. Add a question to this test.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">S.No.</th>
                <th className="px-4 py-2 font-medium">Question Type</th>
                <th className="px-4 py-2 font-medium">Subject</th>
                <th className="px-4 py-2 font-medium">Topic</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40"
                  onClick={() => onSelect(item.id)}
                >
                  <td className="px-4 py-3 font-data text-xs">{index + 1}</td>
                  <td className="px-4 py-3">{questionTypeLabel(item.questionType)}</td>
                  <td className="px-4 py-3">{subjectLabels.get(item.subjectId) ?? item.subjectId}</td>
                  <td className="px-4 py-3">{topicLabels.get(item.topicId) ?? item.topicId}</td>
                  <td className="px-4 py-3">
                    <Badge variant={item.isActive ? 'success' : 'secondary'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import type { ColumnDef } from '@tanstack/react-table'

import { sortableHeader } from '@/components/shared/data-table/sortable-header'
import { RowActionsMenu } from '@/components/shared/row-actions-menu'
import { Badge } from '@/components/ui/badge'
import type { TestListItem } from '@/features/test-manager/types'

function statusVariant(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'published') return 'success'
  if (normalized === 'draft') return 'warning'
  return 'default'
}

type TestTableColumnsOptions = {
  onEdit: (test: TestListItem) => void
}

// Widths are % of the table and should add up to 100 with the 3% checkbox column.
export function createTestTableColumns({
  onEdit,
}: TestTableColumnsOptions): ColumnDef<TestListItem>[] {
  return [
    {
      header: 'S.No.',
      accessorKey: 'id',
      enableSorting: false,
      meta: { width: 4 },
      cell: ({ row }) => (
        <span className="font-data text-xs text-foreground">{row.index + 1}</span>
      ),
    },
    {
      header: sortableHeader('Test Name'),
      accessorKey: 'name',
      meta: { width: 12 },
    },
    {
      header: sortableHeader('Start Date'),
      accessorKey: 'startDate',
      meta: { width: 9 },
      cell: ({ row }) => <span className="font-data text-xs">{row.original.startDate}</span>,
    },
    {
      header: 'End Date',
      accessorKey: 'endDate',
      enableSorting: false,
      meta: { width: 9 },
      cell: ({ row }) => <span className="font-data text-xs">{row.original.endDate}</span>,
    },
    {
      header: sortableHeader('Status'),
      accessorKey: 'status',
      meta: { width: 8 },
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>
      ),
    },
    {
      header: 'Question',
      accessorKey: 'question',
      enableSorting: false,
      meta: { width: 8 },
      cell: ({ row }) => <span className="font-data text-xs">{row.original.question}</span>,
    },
    {
      header: 'Test Category',
      accessorKey: 'testCategory',
      enableSorting: false,
      meta: { width: 12 },
    },
    {
      header: 'Test Template',
      accessorKey: 'testTemplate',
      enableSorting: false,
      meta: { width: 12 },
    },
    {
      header: 'Active',
      accessorKey: 'isActive',
      enableSorting: false,
      meta: { width: 8 },
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'warning'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Published',
      accessorKey: 'isPublished',
      enableSorting: false,
      meta: { width: 9 },
      cell: ({ row }) => (
        <Badge variant={row.original.isPublished ? 'success' : 'warning'}>
          {row.original.isPublished ? 'Published' : 'Unpublished'}
        </Badge>
      ),
    },
    {
      header: 'Action',
      id: 'action',
      enableSorting: false,
      meta: { width: 6 },
      cell: ({ row }) => (
        <RowActionsMenu
          items={[
            {
              id: 'edit',
              label: 'Edit',
              onClick: () => onEdit(row.original),
            },
          ]}
        />
      ),
    },
  ]
}

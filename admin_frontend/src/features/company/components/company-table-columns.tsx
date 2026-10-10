import type { ColumnDef } from '@tanstack/react-table'

import { sortableHeader } from '@/components/shared/data-table/sortable-header'
import { RowActionsMenu } from '@/components/shared/row-actions-menu'
import { Badge } from '@/components/ui/badge'
import type { Company } from '@/features/company/types'

function statusVariant(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'active') return 'success'
  if (normalized === 'inactive' || normalized === 'draft') return 'warning'
  return 'default'
}

function formatPlanEndsAt(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

type CompanyTableColumnsOptions = {
  onViewInfo: (company: Company) => void
  onEdit: (company: Company) => void
  onToggleStatus: (company: Company) => void
  onDelete: (company: Company) => void
  isTogglingStatus?: (companyId: string) => boolean
}

export function createCompanyTableColumns({
  onViewInfo,
  onEdit,
  onToggleStatus,
  onDelete,
  isTogglingStatus,
}: CompanyTableColumnsOptions): ColumnDef<Company>[] {
  return [
    {
      header: 'S.No.',
      id: 'serial',
      enableSorting: false,
      meta: { width: 6 },
      cell: ({ row }) => <span className="font-data text-xs text-foreground">{row.index + 1}</span>,
    },
    {
      header: sortableHeader('Company Name'),
      accessorKey: 'name',
      meta: { width: 16 },
    },
    {
      header: sortableHeader('Company Code'),
      accessorKey: 'companyCode',
      meta: { width: 12 },
      cell: ({ row }) => (
        <span className="font-data text-xs">{row.original.companyCode || '-'}</span>
      ),
    },
    {
      header: 'City',
      accessorKey: 'city',
      enableSorting: false,
      meta: { width: 12 },
      cell: ({ row }) => row.original.city || '-',
    },
    {
      header: 'Workspace URL',
      accessorKey: 'workspaceUrl',
      enableSorting: false,
      meta: { width: 18 },
      cell: ({ row }) => <span className="truncate">{row.original.workspaceUrl || '-'}</span>,
    },
    {
      header: sortableHeader('Status'),
      accessorKey: 'status',
      meta: { width: 10 },
      cell: ({ row }) => {
        const status = row.original.status || (row.original.isActive ? 'active' : 'inactive')
        return <Badge variant={statusVariant(status)}>{status || '-'}</Badge>
      },
    },
    {
      header: 'Plan Ends',
      accessorKey: 'planEndsAt',
      enableSorting: false,
      meta: { width: 12 },
      cell: ({ row }) => (
        <span className="font-data text-xs">{formatPlanEndsAt(row.original.planEndsAt)}</span>
      ),
    },
    {
      header: 'Action',
      id: 'action',
      enableSorting: false,
      meta: { width: 8 },
      cell: ({ row }) => {
        const company = row.original
        const status = company.status || (company.isActive ? 'active' : 'inactive')
        const isActive = status.toLowerCase() === 'active'
        const isPending = isTogglingStatus?.(company.id) ?? false

        return (
          <RowActionsMenu
            disabled={isPending}
            items={[
              {
                id: 'view-info',
                label: 'View Info',
                onClick: () => onViewInfo(company),
              },
              {
                id: 'edit',
                label: 'Edit',
                onClick: () => onEdit(company),
              },
              {
                id: 'toggle-status',
                label: isActive ? 'Disable' : 'Enable',
                disabled: isPending,
                onClick: () => onToggleStatus(company),
              },
              {
                id: 'delete',
                label: 'Delete',
                destructive: true,
                onClick: () => onDelete(company),
              },
            ]}
          />
        )
      },
    },
  ]
}

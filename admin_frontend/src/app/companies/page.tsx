import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { DataTable } from '@/components/shared/data-table/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  deleteCompany,
  fetchCompanies,
  setCompanyStatus,
} from '@/features/company/api/resolve-company'
import { CompanyCreateDialog } from '@/features/company/components/company-create-dialog'
import { CompanyEditDialog } from '@/features/company/components/company-edit-dialog'
import { CompanyInfoDialog } from '@/features/company/components/company-info-dialog'
import { createCompanyTableColumns } from '@/features/company/components/company-table-columns'
import type { Company } from '@/features/company/types'
import { usePageLoader } from '@/hooks/use-page-loader'
import { getApiErrorMessage } from '@/lib/axios'

export function CompaniesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewInfoCompanyId, setViewInfoCompanyId] = useState<string | null>(null)
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const queryClient = useQueryClient()

  const {
    data: companies = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  })
  usePageLoader(isLoading)

  const upsertCompanyInList = useCallback(
    (company: Company) => {
      queryClient.setQueryData<Company[]>(['companies'], (current) => {
        const existing = current ?? []
        const index = existing.findIndex((item) => item.id === company.id)

        if (index === -1) {
          return [company, ...existing]
        }

        const next = [...existing]
        next[index] = { ...existing[index], ...company }
        return next
      })
      queryClient.setQueryData(['company', company.id], company)
    },
    [queryClient],
  )

  const handleCreateSuccess = useCallback(
    (company: Company) => {
      upsertCompanyInList(company)
      void queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success(
        company.companyCode ? `Company created (${company.companyCode})` : 'Company created',
      )
    },
    [queryClient, upsertCompanyInList],
  )

  const deleteCompanyMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: (_result, companyId) => {
      queryClient.setQueryData<Company[]>(['companies'], (current) =>
        (current ?? []).filter((item) => item.id !== companyId),
      )
      queryClient.removeQueries({ queryKey: ['company', companyId] })
      setCompanyToDelete(null)
      toast.success('Company deleted')
    },
    onError: (mutationError) => {
      toast.error(getApiErrorMessage(mutationError))
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      setCompanyStatus(id, status),
    onSuccess: (company) => {
      upsertCompanyInList(company)
      toast.success(
        company.status.toLowerCase() === 'active' ? 'Company enabled' : 'Company disabled',
      )
    },
    onError: (mutationError) => {
      toast.error(getApiErrorMessage(mutationError))
    },
  })

  const handleToggleStatus = useCallback(
    (company: Company) => {
      const currentStatus = company.status || (company.isActive ? 'active' : 'inactive')
      const nextStatus = currentStatus.toLowerCase() === 'active' ? 'inactive' : 'active'

      statusMutation.mutate({ id: company.id, status: nextStatus })
    },
    [statusMutation],
  )

  const columns = useMemo(
    () =>
      createCompanyTableColumns({
        onViewInfo: (company) => setViewInfoCompanyId(company.id),
        onEdit: (company) => setEditCompanyId(company.id),
        onToggleStatus: handleToggleStatus,
        onDelete: (company) => setCompanyToDelete(company),
        isTogglingStatus: (companyId) =>
          statusMutation.isPending && statusMutation.variables?.id === companyId,
      }),
    [handleToggleStatus, statusMutation.isPending, statusMutation.variables?.id],
  )

  const handleConfirmDelete = useCallback(() => {
    if (!companyToDelete) return
    deleteCompanyMutation.mutate(companyToDelete.id)
  }, [companyToDelete, deleteCompanyMutation])

  return (
    <div className="space-y-6 md:overflow-hidden">
      <div className="flex items-center justify-between">
        <PageHeader title="Companies" description="Manage platform companies." />

        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Company
        </Button>
      </div>

      <CompanyCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      <CompanyInfoDialog
        companyId={viewInfoCompanyId}
        open={Boolean(viewInfoCompanyId)}
        onOpenChange={(open) => {
          if (!open) setViewInfoCompanyId(null)
        }}
      />

      <CompanyEditDialog
        companyId={editCompanyId}
        open={Boolean(editCompanyId)}
        onOpenChange={(open) => {
          if (!open) setEditCompanyId(null)
        }}
        onSuccess={upsertCompanyInList}
      />

      <ConfirmDialog
        open={Boolean(companyToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteCompanyMutation.isPending) {
            setCompanyToDelete(null)
          }
        }}
        title="Delete company"
        description={
          companyToDelete
            ? `Are you sure you want to delete "${companyToDelete.name}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        isConfirming={deleteCompanyMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {isError && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Unable to load companies'}
        </p>
      )}

      {!isLoading && !isError && (
        <DataTable
          columns={columns}
          data={companies}
          getRowId={(row) => row.id}
          embedded
          pageSize={20}
          pageSizeOptions={[10, 20, 50]}
          dense
          maxBodyHeight="min(72vh, 720px)"
        />
      )}
    </div>
  )
}

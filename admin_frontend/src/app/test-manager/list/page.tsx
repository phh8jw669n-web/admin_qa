import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/shared/data-table/data-table'
import { useDeleteTests } from '@/features/test-manager/api/tests-mutations'
import { useTestsList } from '@/features/test-manager/api/use-tests-list'
import { QtiImportDialog } from '@/features/test-manager/components/qti-import-dialog'
import { TestActionBar } from '@/features/test-manager/components/test-action-bar'
import { TestListFilterBar } from '@/features/test-manager/components/test-list-filter-bar'
import { createTestTableColumns } from '@/features/test-manager/components/test-table-columns'
import { getWizardStepPath } from '@/features/test-manager/lib/wizard-path'
import { useWizardStore } from '@/features/test-manager/store/wizard-store'
import {
  defaultTestListFilters,
  type TestListFilters,
  type TestListItem,
} from '@/features/test-manager/types'
import { useAppPath } from '@/hooks/use-app-path'
import { usePageLoader } from '@/hooks/use-page-loader'
import { getApiErrorMessage } from '@/lib/axios'

export function TestManagerListPage() {
  const [filters, setFilters] = useState<TestListFilters>(defaultTestListFilters)
  const { data = [], isError, error, isLoading } = useTestsList(filters)
  usePageLoader(isLoading)
  const deleteTests = useDeleteTests()
  const navigate = useNavigate()
  const appPath = useAppPath()
  const startEditing = useWizardStore((state) => state.startEditing)
  const [selectedRows, setSelectedRows] = useState<TestListItem[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const selectedIds = selectedRows.map((row) => row.id)
  const selectedCount = selectedIds.length

  const handleSearch = useCallback((next: TestListFilters) => {
    setFilters(next)
  }, [])

  const handleEdit = useCallback(
    (test: TestListItem) => {
      startEditing(String(test.id))
      navigate(getWizardStepPath(appPath, 1, String(test.id)))
    },
    [appPath, navigate, startEditing],
  )

  const columns = useMemo(() => createTestTableColumns({ onEdit: handleEdit }), [handleEdit])

  const handleDelete = useCallback(() => {
    if (selectedCount === 0) return

    deleteTests.mutate(selectedIds, {
      onSuccess: () => {
        setDeleteOpen(false)
        toast.success(`Deleted ${selectedCount} test${selectedCount === 1 ? '' : 's'}`)
      },
      onError: (error) => toast.error(getApiErrorMessage(error)),
    })
  }, [deleteTests, selectedCount, selectedIds])

  return (
    <div className="md:overflow-hidden">
      <TestListFilterBar
        value={filters}
        onSearch={handleSearch}
        actions={
          <TestActionBar
            onImport={() => setImportOpen(true)}
            onDelete={() => setDeleteOpen(true)}
            disableDelete={selectedCount === 0 || deleteTests.isPending}
          />
        }
      />
      {isError && (
        <p className="px-4 py-2 text-sm text-destructive">{getApiErrorMessage(error)}</p>
      )}
      <DataTable
        columns={columns}
        data={data}
        enableRowSelection
        selectionColumnPosition="start"
        getRowId={(row) => String(row.id)}
        embedded
        pageSize={20}
        pageSizeOptions={[10, 20, 50]}
        dense
        maxBodyHeight="min(72vh, 720px)"
        onSelectedRowsChange={setSelectedRows}
      />
      <QtiImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete tests"
        description={`Are you sure you want to delete ${selectedCount} test${selectedCount === 1 ? '' : 's'}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isConfirming={deleteTests.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

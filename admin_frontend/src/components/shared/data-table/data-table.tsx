import type {
  ColumnDef,
  ExpandedState,
  OnChangeFn,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { getPaginationItems } from './pagination'

function getColumnWidth(column: { columnDef: { meta?: { width?: number | string } } }) {
  const width = column.columnDef.meta?.width
  if (width == null) return undefined
  return typeof width === 'number' ? `${width}%` : width
}

export type DataTableBulkActionsContext<TData> = {
  selectedRows: TData[]
  clearSelection: () => void
}

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  enableRowSelection?: boolean
  selectionColumnPosition?: 'start' | 'end'
  enableExpanding?: boolean
  getSubRows?: (row: TData) => TData[] | undefined
  getRowId?: (originalRow: TData, index: number) => string
  bulkActions?: ReactNode | ((ctx: DataTableBulkActionsContext<TData>) => ReactNode)
  pageSize?: number
  pageSizeOptions?: number[]
  embedded?: boolean
  showPagination?: boolean
  dense?: boolean
  maxBodyHeight?: string
  stickyHeader?: boolean
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  onSelectedRowsChange?: (rows: TData[]) => void
}

function TableCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  'aria-label': string
}) {
  return (
    <input
      type="checkbox"
      className="table-checkbox"
      checked={checked}
      ref={(input) => {
        if (input) input.indeterminate = indeterminate ?? false
      }}
      disabled={disabled}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  )
}

export function DataTable<TData>({
  columns,
  data,
  enableRowSelection = false,
  selectionColumnPosition = 'start',
  enableExpanding = false,
  getSubRows,
  getRowId,
  bulkActions,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  embedded = false,
  showPagination = true,
  maxBodyHeight = 'min(65vh, 640px)',
  stickyHeader = true,
  onRowSelectionChange,
  onSelectedRowsChange,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [expanded, setExpanded] = useState<ExpandedState>(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize })

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    setRowSelection(updater)
    onRowSelectionChange?.(updater)
  }

  const tableColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!enableRowSelection) return columns

    const selectionColumn: ColumnDef<TData, unknown> = {
      id: 'select',
      header: ({ table }) => (
        <div className="flex justify-center">
          <TableCheckbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Select all rows"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <TableCheckbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { width: 3 },
    }

    return selectionColumnPosition === 'end'
      ? [...columns, selectionColumn]
      : [selectionColumn, ...columns]
  }, [columns, enableRowSelection, selectionColumnPosition])

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { rowSelection, expanded, sorting, pagination },
    onRowSelectionChange: handleRowSelectionChange,
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: enableExpanding ? getExpandedRowModel() : undefined,
    getSubRows,
    getRowId,
    enableRowSelection,
    enableMultiSort: true,
    initialState: { expanded: true },
  })

  const pageCount = table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex
  const currentPageSize = table.getState().pagination.pageSize
  const totalRows = table.getPrePaginationRowModel().rows.length
  const rangeStart = totalRows === 0 ? 0 : currentPage * currentPageSize + 1
  const rangeEnd = Math.min((currentPage + 1) * currentPageSize, totalRows)
  const cellPadding = 'p-1.5 px-2'
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)
  const hasSelection = selectedRows.length > 0

  useEffect(() => {
    onSelectedRowsChange?.(table.getSelectedRowModel().rows.map((row) => row.original))
    // table is recreated each render; selection and data are the real inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps -- table
  }, [onSelectedRowsChange, rowSelection, data])
  const bulkActionsNode =
    typeof bulkActions === 'function'
      ? bulkActions({
          selectedRows,
          clearSelection: () => setRowSelection({}),
        })
      : bulkActions
  const showBulkActions = enableRowSelection && bulkActionsNode && hasSelection

  return (
    <div className="data-table-shell border-l-1 border-r-1 ">
      <div
        className={cn(
          embedded ? '' : 'table-surface border border-border shadow-sm',
          'relative overflow-hidden',
        )}
      >
        {showBulkActions && <div className="data-table-bulk-overlay">{bulkActionsNode}</div>}

        <ScrollArea className={cn('h-[72vh]', maxBodyHeight)}>
          <table className="w-full table-fixed caption-bottom">
            <colgroup>
              {table.getVisibleLeafColumns().map((column) => (
                <col key={column.id} style={{ width: getColumnWidth(column) }} />
              ))}
            </colgroup>
            <TableHeader
              className={cn('data-table-header', stickyHeader && 'data-table-header--sticky')}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'overflow-hidden text-xs font-medium font-bold text-muted-foreground',
                        stickyHeader && 'data-table-head--sticky',
                        cellPadding,
                      )}
                      style={{ width: getColumnWidth(header.column) }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="data-table-row"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn('overflow-hidden text-xs', cellPadding)}
                        style={{ width: getColumnWidth(cell.column) }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={tableColumns.length}
                    className="h-[64vh] text-center text-muted-foreground"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </ScrollArea>

        {showPagination && pageCount > 0 && (
          <div className="data-table-footer">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {getPaginationItems(currentPage, pageCount).map((item, index) =>
              item === 'dots' ? (
                <span
                  key={`dots-${index}`}
                  className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant={currentPage === item ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 min-w-8 px-2"
                  onClick={() => table.setPageIndex(item)}
                >
                  {item + 1}
                </Button>
              ),
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select
              value={String(currentPageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[72px]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="mr-2 whitespace-nowrap font-data text-xs text-muted-foreground">
              {rangeStart}–{rangeEnd} of {totalRows}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

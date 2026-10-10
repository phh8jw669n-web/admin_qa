import type { Column, HeaderContext } from '@tanstack/react-table'
import { ChevronsUpDown } from 'lucide-react'

type SortableHeaderProps<TData> = {
  label: string
  column: Column<TData, unknown>
}

export function SortableHeader<TData>({ label, column }: SortableHeaderProps<TData>) {
  const sorted = column.getIsSorted()

  return (
    <button
      type="button"
      className="group flex items-center gap-1 whitespace-nowrap text-left"
      onClick={column.getToggleSortingHandler()}
    >
      <span>{label}</span>
      <ChevronsUpDown
        className={
          sorted
            ? 'h-3.5 w-3.5 shrink-0 text-primary'
            : 'h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-primary'
        }
      />
    </button>
  )
}

export function sortableHeader<TData>(label: string) {
  return ({ column }: HeaderContext<TData, unknown>) => (
    <SortableHeader label={label} column={column} />
  )
}

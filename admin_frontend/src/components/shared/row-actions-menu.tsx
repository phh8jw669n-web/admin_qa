import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type RowActionItem = {
  id?: string
  label: ReactNode
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
  hidden?: boolean
}

type RowActionsMenuProps = {
  items: RowActionItem[]
  disabled?: boolean
  align?: 'start' | 'center' | 'end'
  label?: string
  trigger?: ReactNode
}

export function RowActionsMenu({
  items,
  disabled = false,
  align = 'end',
  label = 'Open actions',
  trigger,
}: RowActionsMenuProps) {
  const visibleItems = items.filter((item) => !item.hidden)

  if (visibleItems.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={label}
            disabled={disabled}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {visibleItems.map((item, index) => (
          <DropdownMenuItem
            key={item.id ?? index}
            disabled={item.disabled}
            className={cn(item.destructive && 'text-destructive focus:text-destructive')}
            onClick={item.onClick}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

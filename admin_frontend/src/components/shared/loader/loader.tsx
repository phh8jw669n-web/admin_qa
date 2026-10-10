import { Loader2 } from 'lucide-react'

import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

const sizeClass = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const

type LoaderProps = {
  size?: keyof typeof sizeClass
  label?: string
  className?: string
}

export function Loader({ size = 'md', label, className }: LoaderProps) {
  return (
    <div
      className={cn('inline-flex items-center justify-center gap-2', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className={cn('animate-spin text-primary', sizeClass[size])} />
      {label ? (
        <span className="text-sm text-muted-foreground">{label}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  )
}

export function PageLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex min-h-40 w-full items-center justify-center py-10', className)}>
      <Loader size="lg" label={label} />
    </div>
  )
}

export function MainLoader() {
  const pageLoading = useUiStore((state) => state.pageLoadingCount > 0)

  if (!pageLoading) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
      <Loader size="lg" />
    </div>
  )
}

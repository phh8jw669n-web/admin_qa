import { lazy, Suspense } from 'react'

import { Loader } from '@/components/shared/loader/loader'
import type { RichTextEditorVariant } from '@/components/shared/rich-text-editor/editor-config'
import { cn } from '@/lib/utils'

const CkEditorInstance = lazy(() =>
  import('@/components/shared/rich-text-editor/ckeditor-instance').then((module) => ({
    default: module.CkEditorInstance,
  })),
)

export type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  variant?: RichTextEditorVariant
  minHeight?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type here…',
  disabled,
  variant = 'full',
  minHeight,
  className,
}: RichTextEditorProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center border border-border bg-card"
            style={{ minHeight: minHeight ?? (variant === 'compact' ? '8rem' : '16rem') }}
          >
            <Loader label="Loading editor…" />
          </div>
        }
      >
        <CkEditorInstance
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          variant={variant}
          minHeight={minHeight ?? (variant === 'compact' ? '8rem' : '16rem')}
        />
      </Suspense>
    </div>
  )
}

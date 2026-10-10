import { Check, Eye, ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TestTemplate } from '@/features/test-manager/api/fetch-templates'
import { useTemplates } from '@/features/test-manager/api/use-templates'
import { FormFieldLabel, FieldError } from '@/features/test-manager/components/form-field-label'
import { PageLoader, Loader } from '@/components/shared/loader/loader'
import { getApiErrorMessage } from '@/lib/axios'
import { useFileDownloadUrl } from '@/lib/files'
import { cn } from '@/lib/utils'

type TestTemplatePickerProps = {
  value: string
  error?: string
  onChange: (templateId: string) => void
}

function PlaceholderThumbnail() {
  return (
    <div className="flex h-24 flex-col overflow-hidden rounded-sm border border-slate-200 bg-white">
      <div className="flex h-3 items-center gap-1 border-b border-slate-100 px-1">
        <span className="h-1 w-8 rounded-sm bg-slate-300" />
        <span className="ml-auto h-1 w-4 rounded-sm bg-teal-400" />
      </div>
      <div className="flex flex-1 gap-1 p-1.5">
        <div className="flex-1 space-y-1">
          <div className="h-1.5 w-3/4 rounded-sm bg-slate-200" />
          <div className="h-1.5 w-full rounded-sm bg-slate-100" />
          <div className="h-1.5 w-5/6 rounded-sm bg-slate-100" />
        </div>
        <div className="w-8 space-y-1">
          <div className="h-4 rounded-sm bg-slate-100" />
          <div className="h-4 rounded-sm bg-slate-100" />
        </div>
      </div>
    </div>
  )
}

function TemplatePreview({ imageKey, name }: { imageKey: string; name: string }) {
  const { data: imageUrl, isLoading } = useFileDownloadUrl(imageKey || undefined)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [imageUrl])

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-sm border border-slate-200 bg-white">
        <Loader size="sm" />
      </div>
    )
  }

  if (!imageUrl || broken) {
    return <PlaceholderThumbnail />
  }

  return (
    <div className="flex h-24 items-center justify-center overflow-hidden rounded-sm border border-slate-200 bg-white">
      <img
        src={imageUrl}
        alt={`${name} template preview`}
        className="h-full w-full object-contain"
        onError={() => setBroken(true)}
      />
    </div>
  )
}

function PreviewFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-muted/40 text-muted-foreground',
        className,
      )}
    >
      <ImageOff className="h-8 w-8" aria-hidden />
      <p className="text-sm">Preview not available</p>
    </div>
  )
}

function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: {
  template: TestTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: imageUrl, isLoading } = useFileDownloadUrl(
    open ? template?.imageKey || undefined : undefined,
  )
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [imageUrl, template?.id])

  const showFallback = !isLoading && (!imageUrl || broken)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{template?.name ?? 'Template preview'}</DialogTitle>
          <DialogDescription className="sr-only">
            Full-size preview of the test template image.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <PageLoader className="h-[28rem] min-h-0 py-0" />
        ) : showFallback ? (
          <PreviewFallback className="h-[28rem]" />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
            <img
              src={imageUrl}
              alt={`${template?.name ?? 'Template'} preview`}
              className="max-h-[70vh] w-full object-contain"
              onError={() => setBroken(true)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TemplateCard({
  template,
  selected,
  onSelect,
  onPreview,
}: {
  template: TestTemplate
  selected: boolean
  onSelect: (templateId: string) => void
  onPreview: () => void
}) {
  return (
    <div
      className={cn(
        'cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-colors',
        selected ? 'border-success ring-1 ring-success' : 'border-border hover:border-primary/40',
      )}
      onClick={() => onSelect(template.id)}
    >
      <p className="mb-2 text-sm font-medium">{template.name}</p>
      <div className="group relative">
        <TemplatePreview imageKey={template.imageKey} name={template.name} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-sm bg-foreground/50 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 max-sm:pointer-events-auto max-sm:opacity-100">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation()
              onPreview()
            }}
          >
            <Eye />
            Preview
          </Button>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant={selected ? 'success' : 'secondary'}
        className="mt-3 w-full"
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(template.id)
        }}
      >
        <Check />
        Select
      </Button>
    </div>
  )
}

export function TestTemplatePicker({ value, error, onChange }: TestTemplatePickerProps) {
  const {
    data: templates = [],
    isLoading,
    isError,
    isSuccess,
    error: templatesError,
  } = useTemplates()
  const [previewTemplate, setPreviewTemplate] = useState<TestTemplate | null>(null)

  useEffect(() => {
    if (!isSuccess || !value) return
    if (!templates.some((template) => template.id === value)) {
      onChange('')
    }
  }, [isSuccess, onChange, templates, value])

  return (
    <div className="flex min-h-0 flex-col">
      <FormFieldLabel
        required
        hint="Candidate-facing exam interface used when this test is delivered."
      >
        Select Template
      </FormFieldLabel>
      <FieldError message={error ?? (isError ? getApiErrorMessage(templatesError) : undefined)} />

      <ScrollArea className="mt-3 h-[32rem] pr-3">
        {isLoading ? (
          <PageLoader label="Loading templates…" />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={value === template.id}
                onSelect={onChange}
                onPreview={() => setPreviewTemplate(template)}
              />
            ))}
          </div>
        )}

        {!isLoading && !isError && templates.length === 0 ? (
          <div className="flex min-h-[32rem] items-center justify-center">
            <p className="text-sm text-muted-foreground">No templates found</p>
          </div>
        ) : null}
      </ScrollArea>

      <TemplatePreviewDialog
        template={previewTemplate}
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => {
          if (!open) setPreviewTemplate(null)
        }}
      />
    </div>
  )
}

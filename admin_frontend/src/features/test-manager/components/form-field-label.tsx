import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type FormFieldLabelProps = {
  htmlFor?: string
  children: ReactNode
  required?: boolean
  hint?: string
}

export function FormFieldLabel({ htmlFor, children, required, hint }: FormFieldLabelProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>
        {children}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {hint ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
              aria-label="More information"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{hint}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

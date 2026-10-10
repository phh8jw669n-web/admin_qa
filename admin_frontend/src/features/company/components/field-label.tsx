import type { ReactNode } from 'react'

type FieldLabelProps = {
  htmlFor: string
  children: ReactNode
  required?: boolean
}

export function FieldLabel({ htmlFor, children, required }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  )
}

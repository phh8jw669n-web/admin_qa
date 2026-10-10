import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type WizardStep = {
  id: number
  label: string
}

type WizardShellProps = {
  steps: WizardStep[]
  currentStep: number
  completedSteps: number[]
  children: React.ReactNode
  onClose?: () => void
}

export function WizardShell({
  steps,
  currentStep,
  completedSteps,
  children,
  onClose,
}: WizardShellProps) {
  const progress = (completedSteps.length / steps.length) * 100

  return (
    <div className="space-y-6">
      <div className="panel space-y-3 rounded-md p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {steps.map((step) => {
              const isActive = step.id === currentStep
              const isComplete = completedSteps.includes(step.id)

              return (
                <div
                  key={step.id}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive && 'nav-active',
                    !isActive && isComplete && 'bg-success/10 text-success',
                    !isActive && !isComplete && 'bg-muted text-muted-foreground',
                  )}
                >
                  {step.id}. {step.label}
                </div>
              )
            })}
          </div>

          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Close"
              onClick={onClose}
            >
              <X />
            </Button>
          ) : null}
        </div>
        <Progress value={progress} className="bg-muted" />
      </div>

      <div className="panel rounded-md p-6">{children}</div>
    </div>
  )
}

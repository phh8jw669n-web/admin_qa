import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CompanyCreateForm } from '@/features/company/components/company-create-form'
import type { Company } from '@/features/company/types'

type CompanyCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (company: Company) => void
}

export function CompanyCreateDialog({ open, onOpenChange, onSuccess }: CompanyCreateDialogProps) {
  const handleSuccess = (company: Company) => {
    onSuccess(company)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-5 overflow-hidden sm:max-w-[560px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Create Company</DialogTitle>
        </DialogHeader>

        <CompanyCreateForm onSuccess={handleSuccess} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

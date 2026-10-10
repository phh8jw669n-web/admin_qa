import { useQuery } from '@tanstack/react-query'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageLoader } from '@/components/shared/loader/loader'
import { fetchCompany } from '@/features/company/api/resolve-company'
import { CompanyEditForm } from '@/features/company/components/company-edit-form'
import type { Company } from '@/features/company/types'

type CompanyEditDialogProps = {
  companyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (company: Company) => void
}

export function CompanyEditDialog({
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: CompanyEditDialogProps) {
  const {
    data: company,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => fetchCompany(companyId!),
    enabled: open && Boolean(companyId),
  })

  const handleSuccess = (updated: Company) => {
    onSuccess(updated)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-5 overflow-hidden sm:max-w-[560px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Company</DialogTitle>
        </DialogHeader>

        {isLoading && <PageLoader label="Loading company details…" />}

        {isError && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Unable to load company details'}
          </p>
        )}

        {!isLoading && !isError && company && (
          <CompanyEditForm
            company={company}
            onSuccess={handleSuccess}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

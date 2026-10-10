import { useQuery } from '@tanstack/react-query'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageLoader } from '@/components/shared/loader/loader'
import { fetchCompany } from '@/features/company/api/resolve-company'
import { CompanyCard } from '@/features/company/components/company-card'

type CompanyInfoDialogProps = {
  companyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompanyInfoDialog({ companyId, open, onOpenChange }: CompanyInfoDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-6 overflow-y-auto sm:max-w-[720px]">
        <DialogHeader className="shrink-0 space-y-0">
          <DialogTitle className="leading-normal">Company Info</DialogTitle>
        </DialogHeader>

        {isLoading && <PageLoader label="Loading company details…" />}

        {isError && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Unable to load company details'}
          </p>
        )}

        {!isLoading && !isError && company && <CompanyCard company={company} />}
      </DialogContent>
    </Dialog>
  )
}

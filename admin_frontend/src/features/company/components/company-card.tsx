import { ChartColumnStacked } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Company } from '@/features/company/types'

type CompanyCardProps = {
  company: Company
}

function ColorSwatch({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-border"
        style={{ backgroundColor: value }}
      />
      <span>{value}</span>
    </span>
  )
}

function InfoField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto whitespace-nowrap text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="ml-2">{children}</span>
    </div>
  )
}

export function CompanyCard({ company }: CompanyCardProps) {
  const location = [company.city, company.state, company.country].filter(Boolean).join(', ') || '-'
  const contact = [company.firstName, company.lastName].filter(Boolean).join(' ') || '-'
  const status = company.status || (company.isActive ? 'active' : 'inactive') || '-'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ChartColumnStacked className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <CardTitle className="break-words">{company.name}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 overflow-x-auto pb-6 pt-2">
        <InfoField label="Email">{company.email || '-'}</InfoField>
        <InfoField label="Website">{company.website || '-'}</InfoField>
        <InfoField label="Workspace URL">{company.workspaceUrl || '-'}</InfoField>
        <InfoField label="Company Code">{company.companyCode || '-'}</InfoField>
        <InfoField label="Address">{company.addressLine1 || '-'}</InfoField>
        <InfoField label="Location">{location}</InfoField>
        <InfoField label="PIN Code">{company.pinCode || '-'}</InfoField>
        <InfoField label="Phone">{company.phone || '-'}</InfoField>
        <InfoField label="GST Number">{company.gstNo || '-'}</InfoField>
        <InfoField label="Contact">{contact}</InfoField>
        <InfoField label="Status">{status}</InfoField>
        <InfoField label="Primary Color">
          {company.primaryColor ? <ColorSwatch value={company.primaryColor} /> : '-'}
        </InfoField>
        <InfoField label="Secondary Color">
          {company.secondaryColor ? <ColorSwatch value={company.secondaryColor} /> : '-'}
        </InfoField>
      </CardContent>
    </Card>
  )
}

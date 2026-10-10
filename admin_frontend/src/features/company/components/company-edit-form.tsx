import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Loader } from '@/components/shared/loader/loader'
import { Input } from '@/components/ui/input'
import { updateCompany } from '@/features/company/api/resolve-company'
import { ColorField, isValidHexColor } from '@/features/company/components/color-field'
import { FieldLabel } from '@/features/company/components/field-label'
import { StatusField } from '@/features/company/components/status-field'
import {
  resolveCompanyApiError,
  scrollToCompanyField,
} from '@/features/company/lib/resolve-company-api-error'
import type { Company, UpdateCompanyPayload } from '@/features/company/types'

type CompanyEditFormProps = {
  company: Company
  onSuccess: (company: Company) => void
  onCancel: () => void
}

type FieldErrors = Partial<Record<keyof UpdateCompanyPayload, string>>

const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PIN_PATTERN = /^\d+$/
const PHONE_PATTERN = /^\d{10}$/

function digitsOnly(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, '')
  return typeof maxLength === 'number' ? digits.slice(0, maxLength) : digits
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

function toFormData(company: Company): UpdateCompanyPayload {
  return {
    name: company.name,
    workspaceUrl: company.workspaceUrl,
    addressLine1: company.addressLine1,
    addressLine2: '',
    pinCode: digitsOnly(company.pinCode),
    city: company.city,
    state: company.state,
    country: company.country,
    phone: digitsOnly(company.phone, 10),
    email: company.email,
    website: company.website,
    gstNo: company.gstNo,
    primaryColor: company.primaryColor || '#14b8a6',
    secondaryColor: company.secondaryColor || '#0f172a',
    status: company.status || (company.isActive ? 'active' : 'inactive'),
  }
}

export function CompanyEditForm({ company, onSuccess, onCancel }: CompanyEditFormProps) {
  const [formData, setFormData] = useState<UpdateCompanyPayload>(() => toFormData(company))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setFormData(toFormData(company))
    setFieldErrors({})
    setFormError('')
  }, [company])

  const updateCompanyMutation = useMutation({
    mutationFn: (payload: UpdateCompanyPayload) => updateCompany(company.id, payload),
    onSuccess: (updated) => {
      setFieldErrors({})
      setFormError('')
      onSuccess(updated)
    },
    onError: (mutationError) => {
      const { message, field } = resolveCompanyApiError(mutationError)

      if (field) {
        setFieldErrors((previous) => ({
          ...previous,
          [field]: message,
        }))
        setFormError('')
        scrollToCompanyField(field)
        return
      }

      setFormError(message)
    },
  })

  const handleChange = (field: keyof UpdateCompanyPayload, value: string) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }))
    setFieldErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    const name = formData.name.trim()
    const email = formData.email.trim()
    const website = formData.website.trim()
    const workspaceUrl = formData.workspaceUrl.trim()
    const addressLine1 = formData.addressLine1.trim()
    const addressLine2 = formData.addressLine2.trim()
    const pinCode = formData.pinCode.trim()
    const city = formData.city.trim()
    const state = formData.state.trim()
    const country = formData.country.trim()
    const phone = formData.phone.trim()
    const gstNo = formData.gstNo.trim().toUpperCase()
    const primaryColor = formData.primaryColor.trim()
    const secondaryColor = formData.secondaryColor.trim()
    const status = formData.status.trim() || 'active'

    const nextErrors: FieldErrors = {}

    const requiredChecks: Array<[keyof UpdateCompanyPayload, string, string]> = [
      ['name', name, 'Company name is required'],
      ['email', email, 'Email is required'],
      ['website', website, 'Website is required'],
      ['workspaceUrl', workspaceUrl, 'Workspace URL is required'],
      ['addressLine1', addressLine1, 'Address is required'],
      ['pinCode', pinCode, 'PIN code is required'],
      ['city', city, 'City is required'],
      ['state', state, 'State is required'],
      ['country', country, 'Country is required'],
      ['phone', phone, 'Phone is required'],
      ['gstNo', gstNo, 'GST number is required'],
      ['primaryColor', primaryColor, 'Primary color is required'],
      ['secondaryColor', secondaryColor, 'Secondary color is required'],
      ['status', status, 'Status is required'],
    ]

    for (const [field, value, message] of requiredChecks) {
      if (!value) nextErrors[field] = message
    }

    if (primaryColor && !isValidHexColor(primaryColor)) {
      nextErrors.primaryColor = 'Enter a valid hex color'
    }

    if (secondaryColor && !isValidHexColor(secondaryColor)) {
      nextErrors.secondaryColor = 'Enter a valid hex color'
    }

    if (gstNo && !GST_PATTERN.test(gstNo)) {
      nextErrors.gstNo = 'Enter a valid 15-character GST number'
    }

    if (pinCode && !PIN_PATTERN.test(pinCode)) {
      nextErrors.pinCode = 'PIN code must contain numbers only'
    }

    if (phone && !PHONE_PATTERN.test(phone)) {
      nextErrors.phone = 'Enter a 10-digit phone number'
    }

    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    updateCompanyMutation.mutate({
      name,
      email,
      website,
      workspaceUrl,
      addressLine1,
      addressLine2,
      pinCode,
      city,
      state,
      country,
      phone,
      gstNo,
      primaryColor,
      secondaryColor,
      status,
    })
  }

  const isPending = updateCompanyMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-1 pr-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="edit-company-name" required>
            Company Name
          </FieldLabel>
          <Input
            id="edit-company-name"
            value={formData.name}
            onChange={(event) => handleChange('name', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.name ? true : undefined}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="edit-company-email" required>
            Email
          </FieldLabel>
          <Input
            id="edit-company-email"
            type="email"
            value={formData.email}
            onChange={(event) => handleChange('email', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.email ? true : undefined}
          />
          <FieldError message={fieldErrors.email} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="edit-company-website" required>
            Website
          </FieldLabel>
          <Input
            id="edit-company-website"
            type="url"
            value={formData.website}
            onChange={(event) => handleChange('website', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.website ? true : undefined}
          />
          <FieldError message={fieldErrors.website} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="edit-company-workspace-url" required>
            Workspace URL
          </FieldLabel>
          <Input
            id="edit-company-workspace-url"
            value={formData.workspaceUrl}
            onChange={(event) => handleChange('workspaceUrl', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.workspaceUrl ? true : undefined}
          />
          <FieldError message={fieldErrors.workspaceUrl} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="edit-company-code">Company Code</FieldLabel>
          <Input id="edit-company-code" value={company.companyCode || '-'} disabled readOnly />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="edit-company-address" required>
            Address Line 1
          </FieldLabel>
          <Input
            id="edit-company-address"
            value={formData.addressLine1}
            onChange={(event) => handleChange('addressLine1', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.addressLine1 ? true : undefined}
          />
          <FieldError message={fieldErrors.addressLine1} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="edit-company-address-2">Address Line 2</FieldLabel>
          <Input
            id="edit-company-address-2"
            value={formData.addressLine2}
            onChange={(event) => handleChange('addressLine2', event.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="edit-company-pin" required>
              PIN Code
            </FieldLabel>
            <Input
              id="edit-company-pin"
              inputMode="numeric"
              value={formData.pinCode}
              onChange={(event) => handleChange('pinCode', digitsOnly(event.target.value))}
              disabled={isPending}
              required
              aria-invalid={fieldErrors.pinCode ? true : undefined}
            />
            <FieldError message={fieldErrors.pinCode} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="edit-company-city" required>
              City
            </FieldLabel>
            <Input
              id="edit-company-city"
              value={formData.city}
              onChange={(event) => handleChange('city', event.target.value)}
              disabled={isPending}
              required
              aria-invalid={fieldErrors.city ? true : undefined}
            />
            <FieldError message={fieldErrors.city} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="edit-company-state" required>
              State
            </FieldLabel>
            <Input
              id="edit-company-state"
              value={formData.state}
              onChange={(event) => handleChange('state', event.target.value)}
              disabled={isPending}
              required
              aria-invalid={fieldErrors.state ? true : undefined}
            />
            <FieldError message={fieldErrors.state} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="edit-company-country" required>
              Country
            </FieldLabel>
            <Input
              id="edit-company-country"
              value={formData.country}
              onChange={(event) => handleChange('country', event.target.value)}
              disabled={isPending}
              required
              aria-invalid={fieldErrors.country ? true : undefined}
            />
            <FieldError message={fieldErrors.country} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="edit-company-phone" required>
              Phone
            </FieldLabel>
            <Input
              id="edit-company-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={formData.phone}
              onChange={(event) => handleChange('phone', digitsOnly(event.target.value, 10))}
              disabled={isPending}
              required
              aria-invalid={fieldErrors.phone ? true : undefined}
            />
            <FieldError message={fieldErrors.phone} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="edit-company-gst" required>
              GST Number
            </FieldLabel>
            <Input
              id="edit-company-gst"
              maxLength={15}
              value={formData.gstNo}
              onChange={(event) => handleChange('gstNo', event.target.value.toUpperCase())}
              disabled={isPending}
              required
              aria-invalid={fieldErrors.gstNo ? true : undefined}
            />
            <FieldError message={fieldErrors.gstNo} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ColorField
            id="edit-company-primary-color"
            label="Primary Color"
            value={formData.primaryColor}
            fallback="#14b8a6"
            required
            error={fieldErrors.primaryColor}
            onChange={(value) => handleChange('primaryColor', value)}
            disabled={isPending}
          />

          <ColorField
            id="edit-company-secondary-color"
            label="Secondary Color"
            value={formData.secondaryColor}
            fallback="#0f172a"
            required
            error={fieldErrors.secondaryColor}
            onChange={(value) => handleChange('secondaryColor', value)}
            disabled={isPending}
          />
        </div>

        <StatusField
          id="edit-company-status"
          value={formData.status}
          error={fieldErrors.status}
          onChange={(value) => handleChange('status', value)}
          disabled={isPending}
        />

        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader size="sm" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  )
}

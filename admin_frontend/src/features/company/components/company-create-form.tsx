import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Loader } from '@/components/shared/loader/loader'
import { Input } from '@/components/ui/input'
import { createCompany } from '@/features/company/api/resolve-company'
import { ColorField, isValidHexColor } from '@/features/company/components/color-field'
import { FieldLabel } from '@/features/company/components/field-label'
import { StatusField } from '@/features/company/components/status-field'
import {
  resolveCompanyApiError,
  scrollToCompanyField,
} from '@/features/company/lib/resolve-company-api-error'
import type { Company, CreateCompanyPayload } from '@/features/company/types'

type CompanyCreateFormProps = {
  onSuccess: (company: Company) => void
  onCancel: () => void
}

type FieldErrors = Partial<Record<keyof CreateCompanyPayload, string>>

const emptyForm: CreateCompanyPayload = {
  name: '',
  email: '',
  website: '',
  workspaceUrl: '',
  addressLine1: '',
  pinCode: '',
  city: '',
  state: '',
  country: '',
  phone: '',
  gstNo: '',
  firstName: '',
  lastName: '',
  primaryColor: '#14b8a6',
  secondaryColor: '#0f172a',
  status: 'active',
}

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

export function CompanyCreateForm({ onSuccess, onCancel }: CompanyCreateFormProps) {
  const [formData, setFormData] = useState<CreateCompanyPayload>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: (company) => {
      setFormData(emptyForm)
      setFieldErrors({})
      setFormError('')
      onSuccess(company)
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

  const handleChange = (field: keyof CreateCompanyPayload, value: string) => {
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
    const pinCode = formData.pinCode.trim()
    const city = formData.city.trim()
    const state = formData.state.trim()
    const country = formData.country.trim()
    const phone = formData.phone.trim()
    const gstNo = formData.gstNo.trim().toUpperCase()
    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()
    const primaryColor = formData.primaryColor.trim()
    const secondaryColor = formData.secondaryColor.trim()
    const status = formData.status.trim() || 'active'

    const nextErrors: FieldErrors = {}

    const requiredChecks: Array<[keyof CreateCompanyPayload, string, string]> = [
      ['name', name, 'Company name is required'],
      ['email', email, 'Email is required'],
      ['website', website, 'Website is required'],
      ['workspaceUrl', workspaceUrl, 'Workspace URL is required'],
      ['addressLine1', addressLine1, 'Address is required'],
      ['pinCode', pinCode, 'PIN code is required'],
      ['city', city, 'City is required'],
      ['state', state, 'State is required'],
      ['country', country, 'Country is required'],
      ['firstName', firstName, 'First name is required'],
      ['lastName', lastName, 'Last name is required'],
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

    createCompanyMutation.mutate({
      name,
      email,
      website,
      workspaceUrl,
      addressLine1,
      pinCode,
      city,
      state,
      country,
      phone,
      gstNo,
      firstName,
      lastName,
      primaryColor,
      secondaryColor,
      status,
    })
  }

  const isPending = createCompanyMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-1 pr-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="company-name" required>
            Company Name
          </FieldLabel>
          <Input
            id="company-name"
            placeholder="Enter company name"
            value={formData.name}
            onChange={(event) => handleChange('name', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.name ? true : undefined}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="company-email" required>
            Email
          </FieldLabel>
          <Input
            id="company-email"
            type="email"
            placeholder="Enter company email"
            value={formData.email}
            onChange={(event) => handleChange('email', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.email ? true : undefined}
          />
          <FieldError message={fieldErrors.email} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="company-website" required>
            Website
          </FieldLabel>
          <Input
            id="company-website"
            type="url"
            placeholder="https://example.com"
            value={formData.website}
            onChange={(event) => handleChange('website', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.website ? true : undefined}
          />
          <FieldError message={fieldErrors.website} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="company-workspace-url" required>
            Workspace URL
          </FieldLabel>
          <Input
            id="company-workspace-url"
            placeholder="acme"
            value={formData.workspaceUrl}
            onChange={(event) => handleChange('workspaceUrl', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.workspaceUrl ? true : undefined}
          />
          <FieldError message={fieldErrors.workspaceUrl} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="company-address" required>
            Address
          </FieldLabel>
          <Input
            id="company-address"
            placeholder="Street address"
            value={formData.addressLine1}
            onChange={(event) => handleChange('addressLine1', event.target.value)}
            disabled={isPending}
            required
            aria-invalid={fieldErrors.addressLine1 ? true : undefined}
          />
          <FieldError message={fieldErrors.addressLine1} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="company-pin-code" required>
              PIN Code
            </FieldLabel>
            <Input
              id="company-pin-code"
              placeholder="400001"
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
            <FieldLabel htmlFor="company-city" required>
              City
            </FieldLabel>
            <Input
              id="company-city"
              placeholder="Mumbai"
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
            <FieldLabel htmlFor="company-state" required>
              State
            </FieldLabel>
            <Input
              id="company-state"
              placeholder="Maharashtra"
              value={formData.state}
              onChange={(event) => handleChange('state', event.target.value)}
              disabled={isPending}
              required
              aria-invalid={fieldErrors.state ? true : undefined}
            />
            <FieldError message={fieldErrors.state} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="company-country" required>
              Country
            </FieldLabel>
            <Input
              id="company-country"
              placeholder="India"
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
            <FieldLabel htmlFor="company-first-name" required>
              First Name
            </FieldLabel>
            <Input
              id="company-first-name"
              placeholder="First name"
              value={formData.firstName}
              onChange={(event) => handleChange('firstName', event.target.value)}
              disabled={isPending}
              required
              aria-invalid={fieldErrors.firstName ? true : undefined}
            />
            <FieldError message={fieldErrors.firstName} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="company-last-name" required>
              Last Name
            </FieldLabel>
            <Input
              id="company-last-name"
              placeholder="Last name"
              value={formData.lastName}
              onChange={(event) => handleChange('lastName', event.target.value)}
              disabled={isPending}
              required
              aria-invalid={fieldErrors.lastName ? true : undefined}
            />
            <FieldError message={fieldErrors.lastName} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="company-phone" required>
              Phone
            </FieldLabel>
            <Input
              id="company-phone"
              type="tel"
              inputMode="numeric"
              placeholder="9876543210"
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
            <FieldLabel htmlFor="company-gst" required>
              GST Number
            </FieldLabel>
            <Input
              id="company-gst"
              placeholder="22AAAAA0000A1Z5"
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
            id="company-primary-color"
            label="Primary Color"
            value={formData.primaryColor}
            fallback="#14b8a6"
            required
            error={fieldErrors.primaryColor}
            onChange={(value) => handleChange('primaryColor', value)}
            disabled={isPending}
          />

          <ColorField
            id="company-secondary-color"
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
          id="company-status"
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
              Creating...
            </>
          ) : (
            'Create Company'
          )}
        </Button>
      </div>
    </form>
  )
}

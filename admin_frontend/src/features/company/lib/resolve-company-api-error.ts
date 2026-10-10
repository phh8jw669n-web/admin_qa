import { getApiErrorMessage } from '@/lib/axios'

export type CompanyApiErrorField =
  'name' | 'email' | 'website' | 'workspaceUrl' | 'addressLine1' | 'pinCode' | 'phone' | 'gstNo'

const FIELD_MATCHERS: Array<{
  field: CompanyApiErrorField
  patterns: RegExp[]
}> = [
  {
    field: 'workspaceUrl',
    patterns: [/workspace/i],
  },
  {
    field: 'email',
    patterns: [/email/i],
  },
  {
    field: 'gstNo',
    patterns: [/\bgst\b/i],
  },
  {
    field: 'phone',
    patterns: [/phone|mobile/i],
  },
  {
    field: 'website',
    patterns: [/website/i],
  },
  {
    field: 'name',
    patterns: [/company\s*name|\bname\b/i],
  },
  {
    field: 'pinCode',
    patterns: [/pin\s*code|pincode|postal/i],
  },
  {
    field: 'addressLine1',
    patterns: [/address/i],
  },
]

const FIELD_INPUT_IDS: Record<CompanyApiErrorField, string[]> = {
  name: ['company-name', 'edit-company-name'],
  email: ['company-email', 'edit-company-email'],
  website: ['company-website', 'edit-company-website'],
  workspaceUrl: ['company-workspace-url', 'edit-company-workspace-url'],
  addressLine1: ['company-address', 'edit-company-address'],
  pinCode: ['company-pin-code', 'edit-company-pin'],
  phone: ['company-phone', 'edit-company-phone'],
  gstNo: ['company-gst', 'edit-company-gst'],
}

export function resolveCompanyApiError(error: unknown): {
  message: string
  field: CompanyApiErrorField | null
} {
  const message = getApiErrorMessage(error)

  for (const matcher of FIELD_MATCHERS) {
    if (matcher.patterns.some((pattern) => pattern.test(message))) {
      return { message, field: matcher.field }
    }
  }

  return { message, field: null }
}

export function scrollToCompanyField(field: CompanyApiErrorField) {
  for (const id of FIELD_INPUT_IDS[field]) {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.focus?.()
      return
    }
  }
}

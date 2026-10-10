export type Company = {
  id: string
  name: string
  email: string
  website: string
  workspaceUrl: string
  companyCode: string
  addressLine1: string
  pinCode: string
  city: string
  state: string
  country: string
  phone: string
  gstNo: string
  firstName: string
  lastName: string
  primaryColor: string
  secondaryColor: string
  status: string
  isActive: boolean
  planEndsAt: string
}

export type CreateCompanyPayload = {
  name: string
  email: string
  website: string
  workspaceUrl: string
  addressLine1: string
  pinCode: string
  city: string
  state: string
  country: string
  phone: string
  gstNo: string
  firstName: string
  lastName: string
  primaryColor: string
  secondaryColor: string
  status: string
}

export type UpdateCompanyPayload = {
  name: string
  workspaceUrl: string
  addressLine1: string
  addressLine2: string
  pinCode: string
  city: string
  state: string
  country: string
  phone: string
  email: string
  website: string
  gstNo: string
  primaryColor: string
  secondaryColor: string
  status: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export function normalizeCompany(payload: unknown): Company {
  const root = asRecord(payload)
  const data = asRecord(root?.data) ?? root

  if (!data) {
    throw new Error('Invalid company response')
  }

  const id = asString(data.id)

  if (!id) {
    throw new Error('Invalid company response')
  }

  const status = asString(data.status) ?? ''
  const isActive = asBoolean(data.isActive)

  return {
    id,
    name: asString(data.name) ?? '',
    email: asString(data.email) ?? '',
    website: asString(data.website) ?? '',
    workspaceUrl: asString(data.workspaceUrl) ?? '',
    companyCode: asString(data.companyCode) ?? '',
    addressLine1: asString(data.addressLine1) ?? '',
    pinCode: asString(data.pinCode) ?? '',
    city: asString(data.city) ?? '',
    state: asString(data.state) ?? '',
    country: asString(data.country) ?? '',
    phone: asString(data.phone) ?? '',
    gstNo: asString(data.gstNo) ?? '',
    firstName: asString(data.firstName) ?? '',
    lastName: asString(data.lastName) ?? '',
    primaryColor: asString(data.primaryColor) ?? '',
    secondaryColor: asString(data.secondaryColor) ?? '',
    status,
    isActive: isActive ?? status.toLowerCase() === 'active',
    planEndsAt: asString(data.planEndsAt) ?? '',
  }
}

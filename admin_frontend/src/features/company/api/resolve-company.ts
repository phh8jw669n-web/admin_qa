import { MOCK_COMPANIES } from '@/features/company/mock'
import {
  normalizeCompany,
  type Company,
  type CreateCompanyPayload,
  type UpdateCompanyPayload,
} from '@/features/company/types'
import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'

function toCreateCompanyBody(payload: CreateCompanyPayload): CreateCompanyPayload {
  return {
    name: payload.name,
    email: payload.email,
    website: payload.website,
    workspaceUrl: payload.workspaceUrl,
    addressLine1: payload.addressLine1,
    pinCode: payload.pinCode,
    city: payload.city,
    state: payload.state,
    country: payload.country,
    phone: payload.phone,
    gstNo: payload.gstNo,
    firstName: payload.firstName,
    lastName: payload.lastName,
    primaryColor: payload.primaryColor,
    secondaryColor: payload.secondaryColor,
    status: payload.status,
  }
}

export async function createCompany(payload: CreateCompanyPayload): Promise<Company> {
  const body = toCreateCompanyBody(payload)

  if (useMockApi) {
    const company: Company = {
      id: `company-${Date.now()}`,
      name: body.name,
      email: body.email,
      website: body.website,
      workspaceUrl: body.workspaceUrl,
      companyCode:
        body.name
          .replace(/[^A-Za-z0-9]/g, '')
          .slice(0, 12)
          .toUpperCase() || `CO${Date.now()}`,
      addressLine1: body.addressLine1,
      pinCode: body.pinCode,
      city: body.city,
      state: body.state,
      country: body.country,
      phone: body.phone,
      gstNo: body.gstNo,
      firstName: body.firstName,
      lastName: body.lastName,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      status: body.status || 'active',
      isActive: (body.status || 'active').toLowerCase() === 'active',
      planEndsAt: '',
    }

    MOCK_COMPANIES.push(company)

    return company
  }

  const response = await apiClient<unknown>('/super-admin/companies', {
    method: 'POST',
    body,
  })

  return normalizeCompany(response)
}

export async function updateCompany(id: string, payload: UpdateCompanyPayload): Promise<Company> {
  if (useMockApi) {
    const index = MOCK_COMPANIES.findIndex((item) => item.id === id)
    if (index === -1) {
      throw new Error('Company not found')
    }

    const updated: Company = {
      ...MOCK_COMPANIES[index],
      ...payload,
      isActive: payload.status.toLowerCase() === 'active',
    }

    MOCK_COMPANIES[index] = updated
    return updated
  }

  const response = await apiClient<unknown>(`/super-admin/companies/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: toUpdateCompanyBody(payload),
  })

  return normalizeCompany(response)
}

function toUpdateCompanyBody(payload: UpdateCompanyPayload): UpdateCompanyPayload {
  return {
    name: payload.name,
    workspaceUrl: payload.workspaceUrl,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    pinCode: payload.pinCode,
    city: payload.city,
    state: payload.state,
    country: payload.country,
    phone: payload.phone,
    email: payload.email,
    website: payload.website,
    gstNo: payload.gstNo,
    primaryColor: payload.primaryColor,
    secondaryColor: payload.secondaryColor,
    status: payload.status,
  }
}

function toUpdatePayload(company: Company, status: string): UpdateCompanyPayload {
  return {
    name: company.name,
    workspaceUrl: company.workspaceUrl,
    addressLine1: company.addressLine1,
    addressLine2: '',
    pinCode: company.pinCode,
    city: company.city,
    state: company.state,
    country: company.country,
    phone: company.phone,
    email: company.email,
    website: company.website,
    gstNo: company.gstNo,
    primaryColor: company.primaryColor,
    secondaryColor: company.secondaryColor,
    status,
  }
}

export async function setCompanyStatus(
  id: string,
  status: 'active' | 'inactive',
): Promise<Company> {
  if (useMockApi) {
    const index = MOCK_COMPANIES.findIndex((item) => item.id === id)
    if (index === -1) {
      throw new Error('Company not found')
    }

    const updated: Company = {
      ...MOCK_COMPANIES[index],
      status,
      isActive: status === 'active',
    }

    MOCK_COMPANIES[index] = updated
    return updated
  }

  const company = await fetchCompany(id)
  return updateCompany(id, toUpdatePayload(company, status))
}

export async function deleteCompany(id: string): Promise<void> {
  if (useMockApi) {
    const index = MOCK_COMPANIES.findIndex((item) => item.id === id)
    if (index === -1) {
      throw new Error('Company not found')
    }

    MOCK_COMPANIES.splice(index, 1)
    return
  }

  await apiClient<unknown>(`/super-admin/companies/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function fetchCompany(id: string): Promise<Company> {
  if (useMockApi) {
    const company = MOCK_COMPANIES.find((item) => item.id === id)
    if (!company) {
      throw new Error('Company not found')
    }
    return company
  }

  const response = await apiClient<unknown>(`/super-admin/companies/${encodeURIComponent(id)}`, {
    method: 'GET',
  })

  return normalizeCompany(response)
}

export async function fetchCompanies(): Promise<Company[]> {
  if (useMockApi) {
    return MOCK_COMPANIES
  }

  const payload = await apiClient<unknown>('/super-admin/companies', {
    method: 'GET',
  })

  const root = payload as {
    data?: unknown
    items?: unknown
  }

  const data = root.data as { items?: unknown } | undefined

  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(root.items)
      ? root.items
      : Array.isArray(root.data)
        ? root.data
        : Array.isArray(data?.items)
          ? data.items
          : null

  if (!list) {
    throw new Error('Invalid companies response')
  }

  return list.map(normalizeCompany)
}

import { MOCK_WORKSPACES } from '@/features/workspace/mock'
import { normalizeWorkspace, type Workspace } from '@/features/workspace/types'
import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'
import { defaultTenantConfig } from '@/lib/tenant-config'
import { getWorkspacePublicUrl } from '@/lib/workspace-url'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function workspaceFromVerifyResponse(payload: unknown, slug: string): Workspace {
  const root = asRecord(payload)
  const nestedData = asRecord(root?.data)
  const company = asRecord(root?.company) ?? asRecord(nestedData?.company) ?? nestedData ?? root

  if (
    root &&
    (root.success === false ||
      root.valid === false ||
      root.exists === false ||
      nestedData?.success === false ||
      nestedData?.valid === false ||
      nestedData?.exists === false)
  ) {
    throw new Error(
      asString(root.message) || asString(nestedData?.message) || 'Workspace not found',
    )
  }

  const companyToken =
    asString(company?.companyToken) ??
    asString(root?.companyToken) ??
    asString(nestedData?.companyToken) ??
    asString(company?.token) ??
    asString(root?.token)

  if (!companyToken) {
    throw new Error('Workspace verification did not return a company token')
  }

  const id = asString(company?.id) ?? asString(company?.companyId) ?? asString(root?.id) ?? slug

  const primary =
    asString(company?.primaryColor) ??
    asString(company?.primary_color) ??
    asString(root?.primaryColor) ??
    asString(nestedData?.primaryColor) ??
    defaultTenantConfig.theme.primary

  const secondary =
    asString(company?.secondaryColor) ??
    asString(company?.secondary_color) ??
    asString(root?.secondaryColor) ??
    asString(nestedData?.secondaryColor) ??
    defaultTenantConfig.theme.secondary

  return {
    id,
    slug,
    name: asString(company?.name) ?? slug,
    companyToken,
    theme: {
      primary,
      secondary,
      logo: '',
    },
  }
}

const inflightWorkspaceResolves = new Map<string, Promise<Workspace>>()

async function fetchVerifiedWorkspace(slug: string): Promise<Workspace> {
  const workspaceUrl = getWorkspacePublicUrl(slug)
  const payload = await apiClient<unknown>('/companies/verify-workspace', {
    method: 'POST',
    body: { workspaceUrl },
  })

  return workspaceFromVerifyResponse(payload, slug)
}

export async function resolveWorkspace(slug: string): Promise<Workspace> {
  if (useMockApi) {
    const match = MOCK_WORKSPACES.find((workspace) => workspace.slug === slug)

    if (!match) {
      throw new Error('Workspace not found')
    }

    return match
  }

  const pending = inflightWorkspaceResolves.get(slug)
  if (pending) return pending

  const request = fetchVerifiedWorkspace(slug).finally(() => {
    inflightWorkspaceResolves.delete(slug)
  })

  inflightWorkspaceResolves.set(slug, request)
  return request
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  if (useMockApi) {
    return MOCK_WORKSPACES
  }

  const payload = await apiClient<unknown>('/workspaces')
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : null

  if (!list) {
    throw new Error('Invalid workspaces response')
  }

  return list.map(normalizeWorkspace)
}

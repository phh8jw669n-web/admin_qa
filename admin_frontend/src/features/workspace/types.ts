import { defaultTenantConfig } from '@/lib/tenant-config'

export type Workspace = {
  id: string
  slug: string
  name: string
  companyToken: string | null
  theme: {
    primary: string
    secondary: string
    logo: string
  }
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

export function normalizeWorkspace(payload: unknown): Workspace {
  const root = asRecord(payload)
  const data = asRecord(root?.data) ?? root

  if (!data) {
    throw new Error('Invalid workspace response')
  }

  const theme = asRecord(data.theme) ?? asRecord(data.branding) ?? {}
  const id = asString(data.id)
  const slug = asString(data.slug)

  if (!id || !slug) {
    throw new Error('Invalid workspace response')
  }

  const primary =
    asString(theme.primary) ??
    asString(theme.primaryColor) ??
    asString(data.primaryColor) ??
    asString(data.primary_color) ??
    asString(data.brandColor) ??
    defaultTenantConfig.theme.primary

  const secondary =
    asString(theme.secondary) ??
    asString(theme.secondaryColor) ??
    asString(data.secondaryColor) ??
    asString(data.secondary_color) ??
    defaultTenantConfig.theme.secondary

  const logo = asString(theme.logo) ?? asString(data.logo) ?? ''

  return {
    id,
    slug,
    name: asString(data.name) ?? slug,
    companyToken: asString(data.companyToken) ?? null,
    theme: {
      primary,
      secondary,
      logo,
    },
  }
}

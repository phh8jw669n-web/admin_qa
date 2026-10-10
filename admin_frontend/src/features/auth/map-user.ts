import { getPermissionsForRole } from '@/features/auth/permissions'
import type { AuthAdmin, AuthUser } from '@/features/auth/types'

export function toAuthUser(admin: AuthAdmin, workspaceSlug: string | null = null): AuthUser {
  const name = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim() || admin.email

  return {
    id: admin.id,
    name,
    email: admin.email,
    role: admin.role,
    permissions: getPermissionsForRole(admin.role),
    workspaceId: admin.companyId,
    workspaceSlug,
  }
}

export function splitDisplayName(name: string): Pick<AuthAdmin, 'firstName' | 'lastName'> {
  const [firstName = name, ...rest] = name.trim().split(/\s+/)
  return {
    firstName,
    lastName: rest.join(' '),
  }
}

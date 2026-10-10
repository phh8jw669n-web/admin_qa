import type { AuthUser, Permission, Role } from '@/features/auth/types'

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ['workspaces:view', 'companies:view'],
  admin: [
    'dashboard:view',
    'test-manager:view',
    'test-manager:create',
    'test-manager:edit',
    'category:view',
    'question-bank:view',
  ],
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
}

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role]
}

export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false
  return user.permissions.includes(permission)
}

export function hasAnyPermission(user: AuthUser | null, permissions: Permission[]): boolean {
  if (!user) return false
  return permissions.some((permission) => user.permissions.includes(permission))
}

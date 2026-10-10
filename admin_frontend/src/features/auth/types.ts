export type Role = 'super_admin' | 'admin'

export type Permission =
  | 'dashboard:view'
  | 'test-manager:view'
  | 'test-manager:create'
  | 'test-manager:edit'
  | 'category:view'
  | 'question-bank:view'
  | 'workspaces:view'
  | 'companies:view'

export type AuthAdmin = {
  id: string
  companyId: string | null
  firstName: string
  lastName: string
  email: string
  role: Role
  isMfaEnabled: boolean
  isActive: boolean
  profileImageUrl: string | null
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
  permissions: Permission[]
  workspaceId: string | null
  workspaceSlug: string | null
}

export type LoginCredentials = {
  email: string
  password: string
  companyToken?: string
}

export type AuthSession = {
  accessToken: string
  refreshToken: string | null
  tokenType: string
  expiresIn: string | null
  admin: AuthAdmin
  workspaceSlug?: string | null
}

export function isSuperAdmin(user: Pick<AuthUser, 'role'> | null): boolean {
  return user?.role === 'super_admin'
}

export function mapRole(role: string | undefined): Role {
  const normalized = (role ?? '').toLowerCase().replace(/-/g, '_')
  if (normalized === 'super_admin') return 'super_admin'
  return 'admin'
}

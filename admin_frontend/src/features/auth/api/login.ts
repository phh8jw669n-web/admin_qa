import { splitDisplayName } from '@/features/auth/map-user'
import type { AuthAdmin, AuthSession, LoginCredentials, Role } from '@/features/auth/types'
import { mapRole } from '@/features/auth/types'
import { apiClient } from '@/lib/api-client'
import { useMockApi } from '@/lib/env'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

type MockUser = LoginCredentials & {
  user: {
    id: string
    name: string
    email: string
    role: Role
    workspaceId: string
    workspaceSlug: string
  }
}

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  data?: T
}

type SuperAdminLoginData = {
  accessToken: string
  refreshToken?: string
  tokenType?: string
  expiresIn?: string
  admin?: {
    id: string
    companyId?: string | null
    firstName?: string
    lastName?: string
    email: string
    role?: string
    isMfaEnabled?: boolean
    isActive?: boolean
    profileImageUrl?: string | null
  }
  user?: {
    id: string
    companyId?: string | null
    firstName?: string
    lastName?: string
    email: string
    role?: string
    isMfaEnabled?: boolean
    isActive?: boolean
    profileImageUrl?: string | null
  }
}

const MOCK_USERS: MockUser[] = [
  {
    email: 'admin@testtakers.com',
    password: 'Admin@123',
    user: {
      id: '1',
      name: 'Admin User',
      email: 'admin@testtakers.com',
      role: 'admin',
      workspaceId: 'ws-acme',
      workspaceSlug: 'acme',
    },
  },
  {
    email: 'admin@demo.testtakers.com',
    password: 'Admin@123',
    user: {
      id: '4',
      name: 'Demo Admin',
      email: 'admin@demo.testtakers.com',
      role: 'admin',
      workspaceId: 'ws-demo',
      workspaceSlug: 'demo',
    },
  },
]

function unwrapApi<T>(payload: ApiEnvelope<T>, fallbackMessage: string): T {
  if (payload?.success === false || payload?.data == null) {
    throw new Error(payload?.message || fallbackMessage)
  }

  return payload.data
}

function mapAdmin(admin: NonNullable<SuperAdminLoginData['admin']>): AuthAdmin {
  return {
    id: admin.id,
    companyId: admin.companyId ?? null,
    firstName: admin.firstName ?? '',
    lastName: admin.lastName ?? '',
    email: admin.email,
    role: mapRole(admin.role),
    isMfaEnabled: Boolean(admin.isMfaEnabled),
    isActive: admin.isActive ?? true,
    profileImageUrl: admin.profileImageUrl ?? null,
  }
}

function mapSuperAdminLogin(payload: ApiEnvelope<SuperAdminLoginData>): AuthSession {
  const data = unwrapApi(payload, 'Unable to sign in')
  const admin = data.admin ?? data.user

  if (!data.accessToken || !admin?.id || !admin.email) {
    throw new Error('Invalid login response')
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? null,
    tokenType: data.tokenType ?? 'Bearer',
    expiresIn: data.expiresIn ?? null,
    admin: mapAdmin(admin),
    workspaceSlug: null,
  }
}

async function loginSuperAdmin(credentials: LoginCredentials): Promise<AuthSession> {
  const payload = await apiClient<ApiEnvelope<SuperAdminLoginData>>('/super-admin/login', {
    method: 'POST',
    body: {
      email: credentials.email,
      password: credentials.password,
    },
  })

  return mapSuperAdminLogin(payload)
}

function syncWorkspaceId(companyId: string | null) {
  if (!companyId) return

  const { workspace, setReady } = useWorkspaceStore.getState()
  if (!workspace || workspace.id === companyId) return

  setReady({
    ...workspace,
    id: companyId,
  })
}

async function loginCompanyAdmin(
  credentials: LoginCredentials,
  workspace: { slug: string; companyToken: string | null },
): Promise<AuthSession> {
  const companyToken = credentials.companyToken || workspace.companyToken

  if (!companyToken) {
    throw new Error('Workspace is not verified')
  }

  if (useMockApi) {
    const match = MOCK_USERS.find(
      (entry) =>
        entry.email.toLowerCase() === credentials.email.trim().toLowerCase() &&
        entry.password === credentials.password,
    )

    if (!match) {
      throw new Error('Invalid email or password')
    }

    if (match.user.workspaceSlug !== workspace.slug) {
      throw new Error('This account does not belong to this workspace.')
    }

    const { firstName, lastName } = splitDisplayName(match.user.name)

    return {
      accessToken: `mock-token-${match.user.id}`,
      refreshToken: null,
      tokenType: 'Bearer',
      expiresIn: null,
      admin: {
        id: match.user.id,
        companyId: match.user.workspaceId,
        firstName,
        lastName,
        email: match.user.email,
        role: match.user.role,
        isMfaEnabled: false,
        isActive: true,
        profileImageUrl: null,
      },
      workspaceSlug: match.user.workspaceSlug,
    }
  }

  const payload = await apiClient<ApiEnvelope<SuperAdminLoginData>>('/auth/login', {
    method: 'POST',
    body: {
      email: credentials.email,
      password: credentials.password,
      companyToken,
    },
  })

  return {
    ...mapSuperAdminLogin(payload),
    workspaceSlug: workspace.slug,
  }
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const workspace = useWorkspaceStore.getState().workspace

  if (!workspace) {
    return loginSuperAdmin(credentials)
  }

  const session = await loginCompanyAdmin(credentials, workspace)
  syncWorkspaceId(session.admin.companyId)
  return session
}

export async function logoutApi(): Promise<void> {
  const admin = useAuthStore.getState().admin
  if (!admin || admin.role !== 'super_admin') {
    if (useMockApi) return
  }

  await apiClient<void>('/auth/logout', { method: 'POST' })
}

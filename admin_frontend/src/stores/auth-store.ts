import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { toAuthUser } from '@/features/auth/map-user'
import type { AuthAdmin, AuthSession, AuthUser } from '@/features/auth/types'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  tokenType: string | null
  expiresIn: string | null
  admin: AuthAdmin | null
  user: AuthUser | null
  setSession: (session: AuthSession) => void
  logout: () => void
}

const emptySession = {
  accessToken: null,
  refreshToken: null,
  tokenType: null,
  expiresIn: null,
  admin: null,
  user: null,
} as const

function isPersistedSessionValid(state: Partial<AuthState> | undefined): boolean {
  const token = state?.accessToken
  const admin = state?.admin
  const user = state?.user

  if (!token || !admin || !user) return false
  if (admin.role === 'super_admin') {
    return admin.companyId == null && !token.startsWith('mock-token-')
  }
  return Boolean(admin.companyId && user.workspaceSlug)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...emptySession,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          tokenType: session.tokenType,
          expiresIn: session.expiresIn,
          admin: session.admin,
          user: toAuthUser(session.admin, session.workspaceSlug ?? null),
        }),
      logout: () => set({ ...emptySession }),
    }),
    {
      name: 'auth-store-v3',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenType: state.tokenType,
        expiresIn: state.expiresIn,
        admin: state.admin,
        user: state.user,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<AuthState> | undefined

        if (!isPersistedSessionValid(persistedState)) {
          return { ...current, ...emptySession }
        }

        return {
          ...current,
          ...persistedState,
        }
      },
    },
  ),
)

export function useIsAuthenticated(): boolean {
  const accessToken = useAuthStore((state) => state.accessToken)
  const admin = useAuthStore((state) => state.admin)
  return Boolean(accessToken && admin)
}

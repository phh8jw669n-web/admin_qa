import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { hasPermission } from '@/features/auth/permissions'
import { isSuperAdmin, type Permission } from '@/features/auth/types'
import {
  getDefaultHomePath,
  getLoginPath,
  getWorkspaceSlugFromPathname,
  userBelongsToWorkspace,
  withWorkspacePath,
} from '@/lib/workspace-url'
import { useAuthStore, useIsAuthenticated } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

type ProtectedRouteProps = {
  permission?: Permission
  scope?: 'platform' | 'workspace'
  children?: ReactNode
}

export function ProtectedRoute({ permission, scope, children }: ProtectedRouteProps) {
  const location = useLocation()
  const isAuthenticated = useIsAuthenticated()
  const user = useAuthStore((state) => state.user)
  const workspace = useWorkspaceStore((state) => state.workspace)

  if (!isAuthenticated || !user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`${getLoginPath(location.pathname)}?redirect=${redirect}`} replace />
  }

  if (scope === 'platform' && !isSuperAdmin(user)) {
    return <Navigate to={getDefaultHomePath(user)} replace />
  }

  if (scope === 'workspace') {
    if (isSuperAdmin(user)) {
      return <Navigate to="/workspaces" replace />
    }

    const urlSlug = getWorkspaceSlugFromPathname(location.pathname)
    if (urlSlug && user.workspaceSlug && urlSlug !== user.workspaceSlug) {
      return <Navigate to={getDefaultHomePath(user)} replace />
    }

    if (!workspace || !userBelongsToWorkspace(user, workspace)) {
      if (user.workspaceSlug) {
        return <Navigate to={getDefaultHomePath(user)} replace />
      }

      const loginPath = workspace
        ? withWorkspacePath(workspace.slug, '/login')
        : getLoginPath(location.pathname)
      return <Navigate to={loginPath} replace />
    }
  }

  if (permission && !hasPermission(user, permission)) {
    return <Navigate to={getDefaultHomePath(user)} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function RootRedirect() {
  const isAuthenticated = useIsAuthenticated()
  const user = useAuthStore((state) => state.user)

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getDefaultHomePath(user)} replace />
}

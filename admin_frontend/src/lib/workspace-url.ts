import type { AuthUser } from '@/features/auth/types'

export function getWorkspaceSlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/w\/([^/]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function getWorkspacePublicUrl(slug: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}/w/${slug}`
}

export function stripWorkspacePrefix(pathname: string): string {
  const match = pathname.match(/^\/w\/[^/]+(\/.*)?$/)
  if (!match) return pathname
  return match[1] && match[1].length > 0 ? match[1] : '/'
}

export function withWorkspacePath(slug: string | null | undefined, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!slug) return normalized
  if (normalized === '/') return `/w/${slug}`
  return `/w/${slug}${normalized}`
}

export function isAuthPath(pathname: string): boolean {
  const rest = stripWorkspacePrefix(pathname)
  return rest === '/login' || rest === '/forgot-password'
}

export function getLoginPath(pathname = window.location.pathname): string {
  return withWorkspacePath(getWorkspaceSlugFromPathname(pathname), '/login')
}

export function getDefaultHomePath(user: Pick<AuthUser, 'role' | 'workspaceSlug'>): string {
  if (user.role === 'super_admin') return '/workspaces'
  if (!user.workspaceSlug) return '/login'
  return withWorkspacePath(user.workspaceSlug, '/dashboard')
}

export function userBelongsToWorkspace(
  user: Pick<AuthUser, 'workspaceId' | 'workspaceSlug'>,
  workspace: { id: string; slug: string },
): boolean {
  if (user.workspaceSlug) {
    return user.workspaceSlug === workspace.slug
  }

  if (user.workspaceId != null) {
    return String(user.workspaceId) === String(workspace.id)
  }

  return false
}

export function getSafeRedirect(
  user: Pick<AuthUser, 'role' | 'workspaceSlug'>,
  redirect: string | null,
): string {
  if (redirect && isSafeRedirect(redirect, user)) return redirect
  return getDefaultHomePath(user)
}

function isSafeRedirect(redirect: string, user: Pick<AuthUser, 'role' | 'workspaceSlug'>): boolean {
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return false

  if (user.role === 'super_admin') {
    return !getWorkspaceSlugFromPathname(redirect)
  }

  if (!user.workspaceSlug) return false
  return redirect.startsWith(`/w/${user.workspaceSlug}`)
}

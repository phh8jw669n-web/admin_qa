import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { Loader } from '@/components/shared/loader/loader'
import { resolveWorkspace } from '@/features/workspace/api/resolve-workspace'
import { getApiErrorMessage } from '@/lib/axios'
import { applyTenantTheme, defaultTenantConfig, resetTenantTheme } from '@/lib/tenant-config'
import { getWorkspaceSlugFromPathname } from '@/lib/workspace-url'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Workspace } from '@/features/workspace/types'

function applyWorkspaceTheme(workspace: Workspace) {
  applyTenantTheme({
    terminology: defaultTenantConfig.terminology,
    theme: workspace.theme,
  })
}

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const slug = getWorkspaceSlugFromPathname(location.pathname)
  const status = useWorkspaceStore((state) => state.status)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const requestedSlug = useWorkspaceStore((state) => state.requestedSlug)
  const error = useWorkspaceStore((state) => state.error)
  const setResolving = useWorkspaceStore((state) => state.setResolving)
  const setReady = useWorkspaceStore((state) => state.setReady)
  const setMissing = useWorkspaceStore((state) => state.setMissing)
  const clear = useWorkspaceStore((state) => state.clear)

  useEffect(() => {
    if (!slug) {
      resetTenantTheme()
      clear()
      return
    }

    const workspaceSlug = slug
    const current = useWorkspaceStore.getState()

    if (current.status === 'ready' && current.workspace?.slug === workspaceSlug) {
      applyWorkspaceTheme(current.workspace)
      return
    }

    async function resolve() {
      setResolving(workspaceSlug)
      try {
        const resolved = await resolveWorkspace(workspaceSlug)
        if (useWorkspaceStore.getState().requestedSlug !== workspaceSlug) {
          return
        }
        applyWorkspaceTheme(resolved)
        setReady(resolved)
      } catch (caught) {
        if (useWorkspaceStore.getState().requestedSlug !== workspaceSlug) {
          return
        }
        resetTenantTheme()
        setMissing(workspaceSlug, getApiErrorMessage(caught))
      }
    }

    void resolve()
  }, [slug, clear, setMissing, setReady, setResolving])

  const workspaceReady = Boolean(slug) && status === 'ready' && workspace?.slug === slug
  const platformReady = !slug && !workspace
  const workspaceMissing = Boolean(slug) && status === 'missing' && requestedSlug === slug

  if (workspaceMissing) {
    return <WorkspaceNotFound slug={slug!} message={error} />
  }

  if (!workspaceReady && !platformReady) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <Loader size="lg" label="Checking workspace…" />
      </div>
    )
  }

  return <>{children}</>
}

function WorkspaceNotFound({ slug, message }: { slug: string; message: string | null }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Workspace not found</h1>
        <p className="text-sm text-muted-foreground" role="alert">
          {message || `No active company exists for ${slug}.`}
        </p>
        <p className="text-sm text-muted-foreground">
          Use the workspace URL of an active company, or contact your administrator.
        </p>
      </div>
    </div>
  )
}

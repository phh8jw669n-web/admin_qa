import { create } from 'zustand'

import type { Workspace } from '@/features/workspace/types'

type WorkspaceStatus = 'idle' | 'resolving' | 'ready' | 'missing'

type WorkspaceState = {
  status: WorkspaceStatus
  workspace: Workspace | null
  requestedSlug: string | null
  error: string | null
  setResolving: (slug: string) => void
  setReady: (workspace: Workspace | null) => void
  setMissing: (slug: string, message?: string) => void
  clear: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  status: 'idle',
  workspace: null,
  requestedSlug: null,
  error: null,
  setResolving: (slug) =>
    set({
      status: 'resolving',
      requestedSlug: slug,
      workspace: null,
      error: null,
    }),
  setReady: (workspace) =>
    set({
      status: 'ready',
      workspace,
      requestedSlug: workspace?.slug ?? null,
      error: null,
    }),
  setMissing: (slug, message) =>
    set({
      status: 'missing',
      requestedSlug: slug,
      workspace: null,
      error: message?.trim() || 'Workspace not found',
    }),
  clear: () =>
    set({
      status: 'ready',
      workspace: null,
      requestedSlug: null,
      error: null,
    }),
}))

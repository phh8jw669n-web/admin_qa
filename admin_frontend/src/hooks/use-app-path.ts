import { useParams } from 'react-router-dom'

import { withWorkspacePath } from '@/lib/workspace-url'

export function useWorkspaceSlug(): string | undefined {
  return useParams<{ workspaceSlug?: string }>().workspaceSlug
}

export function useAppPath() {
  const workspaceSlug = useWorkspaceSlug()

  return (path: string) => withWorkspacePath(workspaceSlug, path)
}

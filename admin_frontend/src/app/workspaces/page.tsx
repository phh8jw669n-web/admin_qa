import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchWorkspaces } from '@/features/workspace/api/resolve-workspace'
import { usePageLoader } from '@/hooks/use-page-loader'

export function WorkspacesPage() {
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })
  usePageLoader(isLoading)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces"
        description="Platform workspaces. Tenant admins sign in at each workspace URL."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {workspaces?.map((workspace) => (
          <Card key={workspace.id}>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle>{workspace.name}</CardTitle>
                <CardDescription>/{workspace.slug}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Tenant login:{' '}
                <code className="rounded bg-muted px-1 py-0.5">/w/{workspace.slug}/login</code>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

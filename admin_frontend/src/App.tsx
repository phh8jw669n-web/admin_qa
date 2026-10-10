import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

import { AppRouter } from '@/app/routes'
import { AuthHydrationGate } from '@/components/auth/auth-hydration-gate'
import { WorkspaceGate } from '@/components/auth/workspace-gate'
import { AppProviders } from '@/components/providers/app-providers'
import { queryClient } from '@/lib/query-client'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <AuthHydrationGate>
          <BrowserRouter>
            <WorkspaceGate>
              <AppRouter />
            </WorkspaceGate>
          </BrowserRouter>
        </AuthHydrationGate>
      </AppProviders>
    </QueryClientProvider>
  )
}

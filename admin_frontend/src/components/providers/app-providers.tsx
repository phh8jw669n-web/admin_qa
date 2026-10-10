import { createContext, useContext, type ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'
import { Toaster } from 'sonner'

import type { Workspace } from '@/features/workspace/types'
import { defaultTenantConfig } from '@/lib/tenant-config'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="cbt-admin-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

type TenantContextValue = {
  terminology: {
    candidate: string
    group: string
    course: string
  }
  workspace: Workspace | null
}

const TenantContext = createContext<TenantContextValue>({
  terminology: defaultTenantConfig.terminology,
  workspace: null,
})

export function TenantProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspaceStore((state) => state.workspace)

  return (
    <TenantContext.Provider value={{ terminology: defaultTenantConfig.terminology, workspace }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TenantProvider>
        {children}
        <Toaster position="top-right" richColors />
      </TenantProvider>
    </ThemeProvider>
  )
}

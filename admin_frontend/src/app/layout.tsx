import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/components/sidebar'
import { UserProfileMenu } from '@/components/shared/user-profile-menu'
import { MainLoader } from '@/components/shared/loader/loader'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

export function AppLayout() {
  const { sidebarCollapsed } = useUiStore()

  return (
    <div className="app-shell min-h-screen bg-background">
      <div className="app-shell__content min-h-svh">
        <Sidebar />

        <div
          className={cn(
            'flex h-[100vh] flex-col transition-[margin] duration-200',
            sidebarCollapsed ? 'ml-14' : 'ml-56',
          )}
        >
          <header className="app-header sticky top-0 z-40 border-b border-border">
            <div className="flex h-14 items-center justify-end gap-2 px-4">
              <ThemeToggle />
              <UserProfileMenu />
            </div>
          </header>

          <main className="relative min-h-0 flex-1 overflow-y-auto px-4 py-2">
            <MainLoader />
            <div className="mx-auto max-w-7xl space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

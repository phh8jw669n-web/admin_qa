import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { hasPermission } from '@/features/auth/permissions'
import { isSuperAdmin } from '@/features/auth/types'
import { useAuthUser } from '@/features/auth/hooks/use-permission'
import { navItems, platformNavItems, type NavItem } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { useAppPath } from '@/hooks/use-app-path'
import { getDefaultHomePath, stripWorkspacePrefix } from '@/lib/workspace-url'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

function isChildActive(pathname: string, href: string) {
  if (href === '/test-manager') {
    return pathname === '/test-manager' || pathname.startsWith('/test-manager/wizard')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isGroupActive(pathname: string, item: NavItem) {
  if (item.href) return pathname.startsWith(item.href)
  return item.children?.some((child) => isChildActive(pathname, child.href)) ?? false
}

function filterNavItems(user: ReturnType<typeof useAuthUser>, items: NavItem[]): NavItem[] {
  if (!user) return []

  return items
    .map((item) => {
      if (item.permission && !hasPermission(user, item.permission)) return null

      if (item.children) {
        const children = item.children.filter(
          (child) => !child.permission || hasPermission(user, child.permission),
        )

        if (children.length === 0) return null

        return { ...item, children }
      }

      return item
    })
    .filter((item): item is NavItem => item !== null)
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthUser()
  const appPath = useAppPath()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const { sidebarCollapsed, toggleSidebar } = useUiStore()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const pathname = stripWorkspacePrefix(location.pathname)
  const sourceItems = isSuperAdmin(user) ? platformNavItems : navItems

  const visibleNavItems = useMemo(() => filterNavItems(user, sourceItems), [user, sourceItems])

  useEffect(() => {
    visibleNavItems.forEach((item) => {
      if (item.children && isGroupActive(pathname, item)) {
        setOpenGroups((prev) => ({ ...prev, [item.id]: true }))
      }
    })
  }, [pathname, visibleNavItems])

  const openGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: true }))
  }

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleGroupNavigate = (item: NavItem) => {
    const defaultChild = item.children?.[0]
    if (!defaultChild) return

    openGroup(item.id)
    navigate(appPath(defaultChild.href))
  }

  const homePath = user ? getDefaultHomePath(user) : appPath('/dashboard')
  const brandLabel =
    workspace?.name ?? (isSuperAdmin(user) ? 'Test Takers Platform' : 'Test Takers Admin')

  return (
    <aside
      className={cn(
        'sidebar fixed left-0 top-0 z-50 flex h-svh flex-col border-r border-border transition-[width] duration-200',
        sidebarCollapsed ? 'w-14 px-2 py-4' : 'w-56 px-3 py-4',
      )}
    >
      <div
        className={cn('mb-4 flex items-center gap-2', sidebarCollapsed ? 'justify-center' : 'px-1')}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="shrink-0"
        >
          {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
        {!sidebarCollapsed && (
          <div className="min-w-0 cursor-pointer" onClick={() => navigate(homePath)}>
            <p className="truncate text-sm font-semibold tracking-tight">{brandLabel}</p>
          </div>
        )}
      </div>

      {!sidebarCollapsed && (
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const hasChildren = Boolean(item.children?.length)
            const groupActive = isGroupActive(pathname, item)
            const isOpen = openGroups[item.id] ?? groupActive

            if (!hasChildren && item.href) {
              const isActive = pathname.startsWith(item.href)

              return (
                <Link
                  key={item.id}
                  to={appPath(item.href)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    isActive ? 'nav-active' : 'text-muted-foreground sidebar-nav-link',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            }

            return (
              <div key={item.id} className="space-y-0.5">
                <div className="flex w-full items-center rounded-md">
                  <button
                    type="button"
                    onClick={() => handleGroupNavigate(item)}
                    className="sidebar-nav-link flex flex-1 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-left">{item.label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? 'Collapse section' : 'Expand section'}
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>
                </div>

                {isOpen && item.children && (
                  <div className="ml-3 space-y-0.5 border-l border-border pl-2">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      const childActive = isChildActive(pathname, child.href)

                      return (
                        <Link
                          key={child.href}
                          to={appPath(child.href)}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                            childActive ? 'nav-active' : 'text-muted-foreground sidebar-nav-link',
                          )}
                        >
                          {ChildIcon && <ChildIcon className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate">{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      )}
    </aside>
  )
}

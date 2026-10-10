import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  ChartColumnStacked,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Library,
  List,
} from 'lucide-react'

import type { Permission } from '@/features/auth/types'
import { stripWorkspacePrefix } from '@/lib/workspace-url'

export type NavChild = {
  label: string
  href: string
  icon?: LucideIcon
  permission?: Permission
}

export type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  permission?: Permission
  children?: NavChild[]
}

export const platformNavItems: NavItem[] = [
  {
    id: 'workspaces',
    label: 'Workspaces',
    href: '/workspaces',
    icon: Building2,
    permission: 'workspaces:view',
  },
  {
    id: 'companies',
    label: 'Companies',
    href: '/companies',
    icon: ChartColumnStacked,
    permission: 'companies:view',
  },
]

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard:view',
  },
  {
    id: 'test-manager',
    label: 'Test Manager',
    icon: ClipboardList,
    permission: 'test-manager:view',
    children: [
      {
        label: 'Test',
        href: '/test-manager',
        icon: List,
        permission: 'test-manager:view',
      },
      {
        label: 'Category',
        href: '/category-management',
        icon: FolderTree,
        permission: 'category:view',
      },
    ],
  },
  {
    id: 'question-bank',
    label: 'Question Bank',
    href: '/question-bank',
    icon: Library,
    permission: 'question-bank:view',
  },
]

export const routePermissions: Record<string, Permission | undefined> = {
  '/workspaces': 'workspaces:view',
  '/companies': 'companies:view',
  '/dashboard': 'dashboard:view',
  '/test-manager': 'test-manager:view',
  '/test-manager/wizard': 'test-manager:create',
  '/question-bank': 'question-bank:view',
  '/category-management': 'category:view',
}

export function getRoutePermission(pathname: string): Permission | undefined {
  const path = stripWorkspacePrefix(pathname)
  if (path.startsWith('/workspaces')) return 'workspaces:view'
  if (path.startsWith('/companies')) return 'companies:view'
  if (path.startsWith('/test-manager/wizard')) return routePermissions['/test-manager/wizard']
  if (path.startsWith('/test-manager')) return routePermissions['/test-manager']
  if (path.startsWith('/category-management')) return routePermissions['/category-management']
  if (path.startsWith('/question-bank')) return routePermissions['/question-bank']
  if (path.startsWith('/dashboard')) return routePermissions['/dashboard']
  return undefined
}

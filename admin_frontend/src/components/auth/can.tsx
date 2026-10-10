import type { ReactNode } from 'react'

import { usePermission } from '@/features/auth/hooks/use-permission'
import type { Permission } from '@/features/auth/types'

type CanProps = {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = usePermission(permission)

  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}

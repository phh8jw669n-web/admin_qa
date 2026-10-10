import { hasPermission } from '@/features/auth/permissions'
import type { Permission } from '@/features/auth/types'
import { useAuthStore } from '@/stores/auth-store'

export function usePermission(permission: Permission): boolean {
  const user = useAuthStore((state) => state.user)
  return hasPermission(user, permission)
}

export function useAuthUser() {
  return useAuthStore((state) => state.user)
}

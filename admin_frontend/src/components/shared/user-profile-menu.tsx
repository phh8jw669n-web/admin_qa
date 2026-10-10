import { LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ROLE_LABELS } from '@/features/auth/permissions'
import { logoutApi } from '@/features/auth/api/login'
import { useAuthUser } from '@/features/auth/hooks/use-permission'
import { Loader } from '@/components/shared/loader/loader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getLoginPath } from '@/lib/workspace-url'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth-store'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function UserProfileMenu() {
  const navigate = useNavigate()
  const user = useAuthUser()
  const logout = useAuthStore((state) => state.logout)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    try {
      await logoutApi()
    } catch {
      // Clear local session even if logout API fails.
    }

    logout()
    queryClient.clear()
    navigate(getLoginPath(), { replace: true })
  }

  if (!user && !isLoggingOut) return null

  return (
    <>
      {isLoggingOut ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
          <Loader size="lg" label="Logging out…" />
        </div>
      ) : null}

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-card" disabled={isLoggingOut}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(user.name)}
              </span>
              <span className="hidden max-w-[120px] truncate sm:inline">{user.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <p className="text-xs text-primary">{ROLE_LABELS[user.role]}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? <Loader size="sm" /> : <LogOut />}
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </>
  )
}

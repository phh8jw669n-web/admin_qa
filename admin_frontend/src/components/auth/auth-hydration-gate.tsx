import { useEffect, useState, type ReactNode } from 'react'

import { Loader } from '@/components/shared/loader/loader'
import { useAuthStore } from '@/stores/auth-store'

export function AuthHydrationGate({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated())

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    setHydrated(useAuthStore.persist.hasHydrated())
    return unsub
  }, [])

  if (!hydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader size="lg" />
      </div>
    )
  }

  return <>{children}</>
}

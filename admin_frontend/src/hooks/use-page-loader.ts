import { useEffect } from 'react'

import { useUiStore } from '@/stores/ui-store'

export function usePageLoader(loading: boolean) {
  const showPageLoader = useUiStore((state) => state.showPageLoader)
  const hidePageLoader = useUiStore((state) => state.hidePageLoader)

  useEffect(() => {
    if (!loading) return

    showPageLoader()
    return () => hidePageLoader()
  }, [hidePageLoader, loading, showPageLoader])
}

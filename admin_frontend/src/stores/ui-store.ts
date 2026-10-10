import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  sidebarCollapsed: boolean
  pageLoadingCount: number
  toggleSidebar: () => void
  showPageLoader: () => void
  hidePageLoader: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      pageLoadingCount: 0,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      showPageLoader: () => set((state) => ({ pageLoadingCount: state.pageLoadingCount + 1 })),
      hidePageLoader: () =>
        set((state) => ({ pageLoadingCount: Math.max(0, state.pageLoadingCount - 1) })),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
)

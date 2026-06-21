'use client'

import { create } from 'zustand'

interface UIState {
  selectedEventId: string | null
  sidebarOpen: boolean
  setSelectedEventId: (id: string | null) => void
  toggleSidebar: () => void
  closeSidebar: () => void
}

export const useUI = create<UIState>((set) => ({
  selectedEventId: null,
  sidebarOpen: true,

  setSelectedEventId: (id) => set({ selectedEventId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
}))

'use client'

import { create } from 'zustand'

interface UIState {
  selectedEventId: string | null
  sidebarOpen: boolean
  reportDialogOpen: boolean
  setSelectedEventId: (id: string | null) => void
  toggleSidebar: () => void
  closeSidebar: () => void
  openReportDialog: () => void
  closeReportDialog: () => void
}

export const useUI = create<UIState>((set) => ({
  selectedEventId: null,
  sidebarOpen: true,
  reportDialogOpen: false,

  setSelectedEventId: (id) => set({ selectedEventId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  openReportDialog: () => set({ reportDialogOpen: true }),
  closeReportDialog: () => set({ reportDialogOpen: false }),
}))

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category } from '@watchdog/types'
import { MAX_RADIUS_KM } from '@watchdog/utils'

// All categories on by default so the map shows everything on first load.
const ALL_CATEGORIES: Category[] = [
  'POLICE', 'FIRE', 'AMBULANCE', 'ROAD',
  'CRIME', 'DISTURBANCE', 'SAFETY', 'COMMUNITY',
]

interface FiltersState {
  categories: Category[]
  radiusKm: number
  toggleCategory: (category: Category) => void
  setAllCategories: (enabled: boolean) => void
  setRadius: (km: number) => void
}

export const useFilters = create<FiltersState>()(
  persist(
    (set, get) => ({
      categories: [...ALL_CATEGORIES],
      radiusKm: MAX_RADIUS_KM,

      toggleCategory: (category) =>
        set((state) => ({
          categories: state.categories.includes(category)
            ? state.categories.filter((c) => c !== category)
            : [...state.categories, category],
        })),

      setAllCategories: (enabled) =>
        set({ categories: enabled ? [...ALL_CATEGORIES] : [] }),

      setRadius: (km) => set({ radiusKm: Math.min(km, MAX_RADIUS_KM) }),
    }),
    { name: 'watchdog-filters' },
  ),
)

export { ALL_CATEGORIES }

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category } from '@watchdog/types'
import { CATEGORY_META } from '@watchdog/types'
import { MAX_RADIUS_KM } from '@watchdog/utils'

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as Category[]

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
    { name: 'watchdog-filters', skipHydration: true },
  ),
)

export { ALL_CATEGORIES }

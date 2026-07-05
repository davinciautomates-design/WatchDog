'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchEvents } from '@/lib/api-client'
import { useFilters } from '@/store/filters'

export function useEvents(lat: number | null, lng: number | null) {
  const categories = useFilters((s) => s.categories)
  const radiusKm = useFilters((s) => s.radiusKm)

  return useQuery({
    queryKey: ['events', lat, lng, radiusKm, [...categories].sort()],
    queryFn: () => fetchEvents({ lat: lat!, lng: lng!, radiusKm, categories, limit: 5000 }),
    enabled: lat != null && lng != null,
    refetchInterval: 30_000,
    staleTime: 25_000,
    placeholderData: (prev) => prev,
  })
}

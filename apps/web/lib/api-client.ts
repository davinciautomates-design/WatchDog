import type { ApiResponse, Event, Category } from '@watchdog/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface EventsQueryParams {
  lat: number
  lng: number
  radiusKm?: number
  categories?: Category[]
  page?: number
  limit?: number
}

export async function fetchEvents(params: EventsQueryParams): Promise<ApiResponse<Event[]>> {
  const url = new URL(`${BASE_URL}/api/v1/events`)
  url.searchParams.set('lat', params.lat.toString())
  url.searchParams.set('lng', params.lng.toString())
  if (params.radiusKm != null) url.searchParams.set('radius_km', params.radiusKm.toString())
  if (params.categories?.length) url.searchParams.set('categories', params.categories.join(','))
  if (params.page) url.searchParams.set('page', params.page.toString())
  if (params.limit) url.searchParams.set('limit', params.limit.toString())

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Events fetch failed: HTTP ${res.status}`)
  return res.json() as Promise<ApiResponse<Event[]>>
}

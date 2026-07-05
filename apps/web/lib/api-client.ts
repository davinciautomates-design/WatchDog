import type { ApiResponse, Event, EventsQueryParams } from '@watchdog/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface SubmitReportParams {
  category: string
  description: string
  lat: number
  lng: number
}

export interface ReportResult {
  id: string
  isDuplicate: boolean
  upvoteCount: number
  confidence: number
}

export interface UpvoteResult {
  upvoteCount: number
  confidence: number
}

export async function submitReport(params: SubmitReportParams): Promise<ApiResponse<ReportResult>> {
  const res = await fetch(`${BASE_URL}/api/v1/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const json = (await res.json()) as ApiResponse<ReportResult>
  if (!res.ok) throw Object.assign(new Error(json.errors?.[0]?.message ?? 'Failed to submit report'), { statusCode: res.status, errors: json.errors })
  return json
}

export async function upvoteReport(reportId: string): Promise<ApiResponse<UpvoteResult>> {
  const res = await fetch(`${BASE_URL}/api/v1/reports/${reportId}/upvote`, { method: 'POST' })
  const json = (await res.json()) as ApiResponse<UpvoteResult>
  if (!res.ok) throw new Error(json.errors?.[0]?.message ?? 'Failed to upvote')
  return json
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

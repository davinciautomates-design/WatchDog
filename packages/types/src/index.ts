// ─── Enums ────────────────────────────────────────────────────────────────────

export type SourceType = 'OFFICIAL_API' | 'GOV_DATA' | 'MUNICIPAL' | 'RSS' | 'USER'

export type Category =
  | 'POLICE'
  | 'FIRE'
  | 'AMBULANCE'
  | 'ROAD'
  | 'DISTURBANCE'
  | 'SAFETY'
  | 'COMMUNITY'

export type EventStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'ARCHIVED'

export type ReportStatus = 'PENDING' | 'ACTIVE' | 'MERGED' | 'REJECTED'

// ─── Geo ──────────────────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number
  lng: number
}

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface Event {
  id: string
  sourceId: string | null
  sourceType: SourceType
  category: Category
  title: string
  description: string
  location: GeoPoint
  address: string | null
  confidence: number
  status: EventStatus
  startedAt: string // ISO 8601
  expiresAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Report {
  id: string
  eventId: string | null
  category: Category
  description: string
  photoUrl: string | null
  location: GeoPoint
  confidence: number
  upvoteCount: number
  verifyCount: number
  status: ReportStatus
  createdAt: string
}

export interface Upvote {
  id: string
  reportId: string
  createdAt: string
}

// ─── API Shapes ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  meta: {
    total: number
    page: number
    limit: number
    generatedAt: string
  }
  errors: ApiError[]
}

export interface ApiError {
  code: string
  message: string
  field?: string
}

// ─── Category Metadata ────────────────────────────────────────────────────────

export interface CategoryMeta {
  id: Category
  label: string
  color: string
  icon: string
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  POLICE: { id: 'POLICE', label: 'Police & Crime', color: '#3B82F6', icon: 'shield' },
  FIRE: { id: 'FIRE', label: 'Fire', color: '#EF4444', icon: 'flame' },
  AMBULANCE: { id: 'AMBULANCE', label: 'Ambulance', color: '#22C55E', icon: 'cross' },
  ROAD: { id: 'ROAD', label: 'Road Closure', color: '#F97316', icon: 'cone' },
  DISTURBANCE: { id: 'DISTURBANCE', label: 'Disturbance', color: '#EAB308', icon: 'megaphone' },
  SAFETY: { id: 'SAFETY', label: 'Safety Alert', color: '#14B8A6', icon: 'warning' },
  COMMUNITY: { id: 'COMMUNITY', label: 'Community', color: '#6B7280', icon: 'users' },
}

// Default event TTL in hours by category. Community reports start at 6h and can extend.
export const EVENT_TTL_HOURS: Record<Category, number> = {
  POLICE: 4,
  FIRE: 4,
  AMBULANCE: 4,
  ROAD: 24,
  DISTURBANCE: 2,
  SAFETY: 48,
  COMMUNITY: 6,
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface EventsQueryParams {
  lat: number
  lng: number
  radiusKm?: number
  categories?: Category[]
  page?: number
  limit?: number
}

export interface CreateReportBody {
  category: Category
  description: string
  lat: number
  lng: number
  photoBase64?: string
}

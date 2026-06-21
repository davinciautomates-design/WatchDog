const EARTH_RADIUS_KM = 6371

/** Haversine formula: great-circle distance between two lat/lng points in km. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Geographic centre of the Greater Toronto Area. */
export const GTA_CENTRE = {
  lat: 43.6532,
  lng: -79.3832,
} as const

export const DEFAULT_RADIUS_KM = 20
export const MAX_RADIUS_KM = 20

/** GTA bounding box — used to reject out-of-area reports quickly. */
export const GTA_BOUNDS = {
  north: 44.3,
  south: 43.2,
  east: -78.7,
  west: -80.1,
} as const

export function isWithinGtaBounds(lat: number, lng: number): boolean {
  return (
    lat >= GTA_BOUNDS.south &&
    lat <= GTA_BOUNDS.north &&
    lng >= GTA_BOUNDS.west &&
    lng <= GTA_BOUNDS.east
  )
}

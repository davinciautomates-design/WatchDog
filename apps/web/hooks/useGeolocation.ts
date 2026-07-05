'use client'

import { useState, useEffect } from 'react'
import { GTA_CENTRE } from '@watchdog/utils'

interface GeolocationState {
  lat: number
  lng: number
  error: string | null
  loading: boolean
  usingDefault: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: GTA_CENTRE.lat,
    lng: GTA_CENTRE.lng,
    error: null,
    loading: true,
    usingDefault: true,
  })

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, loading: false, error: 'Geolocation not supported' }))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          loading: false,
          usingDefault: false,
        }),
      (err) =>
        setState((s) => ({
          ...s,
          loading: false,
          // Keep GTA centre as a usable fallback — don't clear lat/lng.
          error: err.code === err.PERMISSION_DENIED ? null : err.message,
          usingDefault: true,
        })),
      { timeout: 10_000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false },
    )
  }, [])

  return state
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type * as GeoJSON from 'geojson'
import Map, { NavigationControl, GeolocateControl, Marker, type MapRef, type MapLayerMouseEvent } from 'react-map-gl'
import { useTheme } from 'next-themes'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Event } from '@watchdog/types'
import { GTA_CENTRE } from '@watchdog/utils'
import { EventLayer, EVENT_INTERACTIVE_LAYERS } from './EventLayer'
import { useUI } from '@/store/ui'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

const MAP_STYLE = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
}

interface MapCanvasProps {
  events: Event[]
  userLat: number | null
  userLng: number | null
  usingDefaultLocation: boolean
}

export function MapCanvas({ events, userLat, userLng, usingDefaultLocation }: MapCanvasProps) {
  const mapRef = useRef<MapRef>(null)
  const { resolvedTheme } = useTheme()
  const selectedEventId = useUI((s) => s.selectedEventId)
  const setSelectedEventId = useUI((s) => s.setSelectedEventId)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedEventId || !mapRef.current) return
    const event = events.find((e) => e.id === selectedEventId)
    if (!event) return
    mapRef.current.flyTo({
      center: [event.location.lng, event.location.lat],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 600,
    })
  }, [selectedEventId, events])

  const mapStyle = resolvedTheme === 'dark' ? MAP_STYLE.dark : MAP_STYLE.light

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features
      if (!features || features.length === 0) {
        setSelectedEventId(null)
        return
      }
      const feature = features[0] as unknown as GeoJSON.Feature<GeoJSON.Point>
      if ((feature.properties as Record<string, unknown>)?.point_count) {
        mapRef.current?.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom: (mapRef.current.getZoom() ?? 11) + 2,
        })
        return
      }
      setSelectedEventId((feature.properties as Record<string, string>)?.id ?? null)
    },
    [setSelectedEventId],
  )

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-muted text-muted-foreground flex-col gap-2">
        <p className="font-medium">Mapbox token not configured</p>
        <p className="text-sm">Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env.local</p>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="flex h-full items-center justify-center bg-muted text-muted-foreground flex-col gap-2">
        <p className="font-medium">Map failed to load</p>
        <p className="text-sm max-w-sm text-center">{mapError}</p>
      </div>
    )
  }

  return (
    // pb-14 on mobile offsets map controls above the bottom sheet handle (3.5rem)
    <div className="w-full h-full pb-14 lg:pb-0">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: GTA_CENTRE.lng,
          latitude: GTA_CENTRE.lat,
          zoom: 11,
        }}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={EVENT_INTERACTIVE_LAYERS}
        onClick={handleMapClick}
        cursor="auto"
        onError={(e) => setMapError(e.error?.message ?? 'Unknown map error')}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" showUserLocation={false} />

        {userLat != null && userLng != null && !usingDefaultLocation && (
          <Marker longitude={userLng} latitude={userLat} anchor="center">
            <div style={{ position: 'relative', width: 20, height: 20 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                backgroundColor: '#3B82F6', opacity: 0.25,
                animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
              }} />
              <div style={{
                position: 'absolute', inset: 3, borderRadius: '50%',
                backgroundColor: '#3B82F6', border: '2px solid white',
                boxShadow: '0 0 4px rgba(0,0,0,0.4)',
              }} />
            </div>
          </Marker>
        )}

        <EventLayer events={events} />
      </Map>
    </div>
  )
}

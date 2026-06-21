'use client'

import { useCallback, useRef } from 'react'
import type * as GeoJSON from 'geojson'
import Map, { NavigationControl, GeolocateControl, type MapRef, type MapLayerMouseEvent } from 'react-map-gl'
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
}

export function MapCanvas({ events }: MapCanvasProps) {
  const mapRef = useRef<MapRef>(null)
  const { resolvedTheme } = useTheme()
  const setSelectedEventId = useUI((s) => s.setSelectedEventId)

  const mapStyle = resolvedTheme === 'dark' ? MAP_STYLE.dark : MAP_STYLE.light

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features
      if (!features || features.length === 0) {
        setSelectedEventId(null)
        return
      }
      // Cast to GeoJSON.Feature since react-map-gl's GeoJSONFeature narrows the type
      const feature = features[0] as unknown as GeoJSON.Feature<GeoJSON.Point>
      if ((feature.properties as Record<string, unknown>)?.point_count) {
        // Cluster click → zoom in to the cluster centre
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

  return (
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
    >
      <NavigationControl position="bottom-right" />
      <GeolocateControl
        position="bottom-right"
        trackUserLocation
        showAccuracyCircle
      />
      <EventLayer events={events} onFeatureClick={setSelectedEventId} />
    </Map>
  )
}

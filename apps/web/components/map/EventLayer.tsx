'use client'

import { Source, Layer } from 'react-map-gl'
import type { CircleLayer, SymbolLayer } from 'react-map-gl'
import type * as GeoJSON from 'geojson'
import { CATEGORY_META } from '@watchdog/types'
import type { Event } from '@watchdog/types'

function eventsToGeoJSON(events: Event[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events.map((event) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [event.location.lng, event.location.lat] },
      properties: {
        id: event.id,
        category: event.category,
        title: event.title,
        confidence: event.confidence,
        color: CATEGORY_META[event.category]?.color ?? '#6B7280',
        startedAt: event.startedAt,
        status: event.status,
      },
    })),
  }
}

const clusterLayer: CircleLayer = {
  id: 'events-clusters',
  type: 'circle',
  source: 'events',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#4B5563',
    'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 16, 20, 28],
    'circle-stroke-color': '#fff',
    'circle-stroke-width': 2,
    'circle-opacity': 0.85,
  },
}

const clusterCountLayer: SymbolLayer = {
  id: 'events-cluster-count',
  type: 'symbol',
  source: 'events',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-size': 12,
  },
  paint: { 'text-color': '#fff' },
}

const pointLayer: CircleLayer = {
  id: 'events-points',
  type: 'circle',
  source: 'events',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': ['get', 'color'],
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 14, 11],
    'circle-stroke-color': '#fff',
    'circle-stroke-width': 2,
    'circle-opacity': [
      'case',
      ['==', ['get', 'status'], 'EXPIRING'], 0.5,
      0.9,
    ],
  },
}

interface EventLayerProps {
  events: Event[]
}

export function EventLayer({ events }: EventLayerProps) {
  const geojson = eventsToGeoJSON(events)

  return (
    <Source id="events" type="geojson" data={geojson} cluster clusterMaxZoom={12} clusterRadius={40}>
      <Layer {...clusterLayer} />
      <Layer {...clusterCountLayer} />
      <Layer {...pointLayer} />
    </Source>
  )
}

/** Returns the interactiveLayerIds to pass to the Map component. */
export const EVENT_INTERACTIVE_LAYERS = ['events-points', 'events-clusters']

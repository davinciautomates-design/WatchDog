'use client'

import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ReportDialog } from '@/components/reports/ReportDialog'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useEvents } from '@/hooks/useEvents'

// Dynamic import prevents mapbox-gl from running during SSR.
// mapbox-gl accesses `window` on load which doesn't exist on the server.
const MapCanvas = dynamic(
  () => import('@/components/map/MapCanvas').then((m) => ({ default: m.MapCanvas })),
  { ssr: false },
)

export default function HomePage() {
  const { lat, lng, usingDefault } = useGeolocation()
  const { data, isLoading, isError } = useEvents(lat, lng)

  const events = data?.data ?? []

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          events={events}
          isLoading={isLoading}
          isError={isError}
          usingDefaultLocation={usingDefault}
        />

        <main className="flex-1 relative min-w-0">
          {/* Top loading bar — shows during initial fetch and background refreshes */}
          {isLoading && (
            <div className="absolute top-0 inset-x-0 z-10 h-0.5 overflow-hidden">
              <div className="h-full bg-blue-500 animate-[loading-bar_1.5s_ease-in-out_infinite]" />
            </div>
          )}

          <MapCanvas
            events={events}
            userLat={lat}
            userLng={lng}
            usingDefaultLocation={usingDefault}
          />
        </main>
      </div>

      <ReportDialog userLat={lat} userLng={lng} />
    </div>
  )
}

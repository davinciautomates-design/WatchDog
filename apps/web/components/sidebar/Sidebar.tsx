'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUp } from 'lucide-react'
import type { Event } from '@watchdog/types'
import { useUI } from '@/store/ui'
import { clsx } from 'clsx'
import { FilterPanel } from './FilterPanel'
import { EventList } from './EventList'
import { EventDetail } from './EventDetail'

interface SidebarProps {
  events: Event[]
  isLoading: boolean
  isError: boolean
  usingDefaultLocation: boolean
}

export function Sidebar({ events, isLoading, isError, usingDefaultLocation }: SidebarProps) {
  const sidebarOpen = useUI((s) => s.sidebarOpen)
  const selectedEventId = useUI((s) => s.selectedEventId)
  const setSelectedEventId = useUI((s) => s.setSelectedEventId)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const prevSelectedRef = useRef<string | null>(null)

  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) ?? null : null

  // Auto-open mobile sheet when user taps a map marker
  useEffect(() => {
    if (selectedEventId && !prevSelectedRef.current) {
      setMobileSheetOpen(true)
    }
    prevSelectedRef.current = selectedEventId
  }, [selectedEventId])

  const sheetContent = (
    <>
      <FilterPanel eventCount={events.length} isLoading={isLoading} />
      {selectedEvent ? (
        <EventDetail event={selectedEvent} />
      ) : (
        <EventList
          events={events}
          isLoading={isLoading}
          isError={isError}
          usingDefaultLocation={usingDefaultLocation}
        />
      )}
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={clsx(
          'hidden lg:flex flex-col border-r border-border bg-background transition-all duration-200 overflow-hidden shrink-0',
          sidebarOpen ? 'w-80' : 'w-0 border-r-0',
        )}
      >
        {sidebarOpen && sheetContent}
      </aside>

      {/* ── Mobile bottom sheet ── */}
      <div
        className={clsx(
          'lg:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col',
          'bg-background border-t border-border rounded-t-2xl shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          'h-[78vh]',
          mobileSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]',
        )}
      >
        {/* Drag handle / collapsed bar */}
        <button
          onClick={() => {
            if (!mobileSheetOpen && selectedEventId) setSelectedEventId(null)
            setMobileSheetOpen((o) => !o)
          }}
          className="relative flex items-center justify-between px-4 h-14 shrink-0"
          aria-label={mobileSheetOpen ? 'Collapse event panel' : 'Expand event panel'}
        >
          {/* Pill handle */}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-muted-foreground/30" />

          <span className="text-sm font-medium mt-2">
            {isLoading && events.length === 0
              ? 'Loading events…'
              : `${events.length.toLocaleString()} event${events.length !== 1 ? 's' : ''} nearby`}
          </span>
          <ChevronUp
            className={clsx(
              'h-4 w-4 mt-2 text-muted-foreground transition-transform duration-300',
              mobileSheetOpen && 'rotate-180',
            )}
          />
        </button>

        {/* Sheet content */}
        <div className="flex-1 overflow-hidden flex flex-col border-t border-border">
          {sheetContent}
        </div>
      </div>

      {/* Backdrop — closes sheet when tapping the map */}
      {mobileSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          onClick={() => setMobileSheetOpen(false)}
        />
      )}
    </>
  )
}

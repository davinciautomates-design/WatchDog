'use client'

import type { Event } from '@watchdog/types'
import { useUI } from '@/store/ui'
import { FilterPanel } from './FilterPanel'
import { EventList } from './EventList'
import { EventDetail } from './EventDetail'
import { clsx } from 'clsx'

interface SidebarProps {
  events: Event[]
  isLoading: boolean
  isError: boolean
  usingDefaultLocation: boolean
}

export function Sidebar({ events, isLoading, isError, usingDefaultLocation }: SidebarProps) {
  const sidebarOpen = useUI((s) => s.sidebarOpen)
  const selectedEventId = useUI((s) => s.selectedEventId)

  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) : null

  return (
    <aside
      className={clsx(
        'flex flex-col border-r border-border bg-background transition-all duration-200 overflow-hidden shrink-0',
        // Desktop: fixed-width sidebar that can collapse
        'hidden lg:flex',
        sidebarOpen ? 'w-80' : 'w-0 border-r-0',
      )}
    >
      {sidebarOpen && (
        <>
          <FilterPanel />
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
      )}
    </aside>
  )
}

'use client'

import { clsx } from 'clsx'
import type { Event } from '@watchdog/types'
import { formatTimeAgo } from '@watchdog/utils'
import { CategoryBadge } from '@/components/ui/Badge'
import { useUI } from '@/store/ui'

interface EventListProps {
  events: Event[]
  isLoading: boolean
  isError: boolean
  usingDefaultLocation: boolean
}

export function EventList({ events, isLoading, isError, usingDefaultLocation }: EventListProps) {
  const selectedEventId = useUI((s) => s.selectedEventId)
  const setSelectedEventId = useUI((s) => s.setSelectedEventId)

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center px-4">
        <p className="text-sm text-destructive font-medium">Failed to load events</p>
        <p className="text-xs text-muted-foreground mt-1">Check that the API server is running</p>
      </div>
    )
  }

  if (isLoading && events.length === 0) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center px-4">
        <p className="text-sm font-medium">No active events nearby</p>
        <p className="text-xs text-muted-foreground mt-1">
          {usingDefaultLocation
            ? 'Showing GTA centre — grant location access for local results'
            : 'All clear in your area'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto flex-1">
      {usingDefaultLocation && (
        <div className="mx-3 my-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          Showing GTA centre — grant location access for local results
        </div>
      )}
      <p className="px-4 py-2 text-xs text-muted-foreground">
        {events.length} event{events.length !== 1 ? 's' : ''} {isLoading ? '(refreshing…)' : ''}
      </p>
      {events.map((event) => (
        <EventListItem
          key={event.id}
          event={event}
          isSelected={event.id === selectedEventId}
          onClick={() => setSelectedEventId(event.id === selectedEventId ? null : event.id)}
        />
      ))}
    </div>
  )
}

function EventListItem({
  event,
  isSelected,
  onClick,
}: {
  event: Event
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-accent',
        isSelected && 'bg-accent',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <CategoryBadge category={event.category} size="sm" />
          <p className="mt-1 text-sm font-medium leading-snug line-clamp-2">{event.title}</p>
          {event.address && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{event.address}</p>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
          {formatTimeAgo(event.startedAt)}
        </span>
      </div>
    </button>
  )
}

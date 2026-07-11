'use client'

import { useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { AlertCircle, RefreshCw } from 'lucide-react'
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
  const queryClient = useQueryClient()

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive/70" />
        <div>
          <p className="text-sm font-medium">Failed to load events</p>
          <p className="text-xs text-muted-foreground mt-1">The API may be temporarily unavailable</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['events'] })}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  if (isLoading && events.length === 0) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-md p-3 border border-border space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-16 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-10 rounded bg-muted animate-pulse ml-auto" />
            </div>
            <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
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

  const communityEvents = events.filter((e) => e.sourceType === 'USER')
  const officialEvents = events.filter((e) => e.sourceType !== 'USER')

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

      {communityEvents.length > 0 && (
        <>
          <p className="px-4 pt-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Community Reports
          </p>
          {communityEvents.map((event) => (
            <EventListItem
              key={event.id}
              event={event}
              isSelected={event.id === selectedEventId}
              onClick={() => setSelectedEventId(event.id === selectedEventId ? null : event.id)}
            />
          ))}
          {officialEvents.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Official Reports
            </p>
          )}
        </>
      )}

      {officialEvents.map((event) => (
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

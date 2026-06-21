'use client'

import { X, MapPin, Clock, Shield } from 'lucide-react'
import type { Event } from '@watchdog/types'
import { formatEventDateTime, formatTimeAgo } from '@watchdog/utils'
import { CategoryBadge } from '@/components/ui/Badge'
import { useUI } from '@/store/ui'

interface EventDetailProps {
  event: Event
}

export function EventDetail({ event }: EventDetailProps) {
  const setSelectedEventId = useUI((s) => s.setSelectedEventId)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <CategoryBadge category={event.category} />
          <h2 className="mt-2 font-semibold leading-snug">{event.title}</h2>
        </div>
        <button
          onClick={() => setSelectedEventId(null)}
          className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors mt-0.5"
          aria-label="Close event detail"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {event.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
        )}

        <div className="space-y-2">
          {event.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>{event.address}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              {formatEventDateTime(event.startedAt)}
              <span className="text-muted-foreground ml-1">({formatTimeAgo(event.startedAt)})</span>
            </span>
          </div>

          {event.expiresAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Expires {formatEventDateTime(event.expiresAt)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              Confidence <span className="font-medium">{event.confidence}</span>
              <span className="text-muted-foreground ml-1">· {event.sourceType.replace('_', ' ')}</span>
            </span>
          </div>
        </div>

        {event.status === 'EXPIRING' && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            This event may be resolving soon
          </div>
        )}

        {/* Metadata key-value display for power users */}
        {Object.keys(event.metadata ?? {}).length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground transition-colors">
              Raw metadata
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

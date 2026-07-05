'use client'

import { useState } from 'react'
import { X, MapPin, Clock, Shield, ThumbsUp } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { Event } from '@watchdog/types'
import { formatEventDateTime, formatTimeAgo } from '@watchdog/utils'
import { CategoryBadge } from '@/components/ui/Badge'
import { useUI } from '@/store/ui'
import { upvoteReport } from '@/lib/api-client'

interface EventDetailProps {
  event: Event
}

export function EventDetail({ event }: EventDetailProps) {
  const setSelectedEventId = useUI((s) => s.setSelectedEventId)
  const queryClient = useQueryClient()
  const [upvoted, setUpvoted] = useState(false)
  const [upvoting, setUpvoting] = useState(false)

  // reportId is stored in metadata for USER events
  const reportId = (event.metadata as Record<string, string>)?.reportId

  async function handleUpvote() {
    if (!reportId || upvoted || upvoting) return
    setUpvoting(true)
    try {
      await upvoteReport(reportId)
      setUpvoted(true)
      await queryClient.invalidateQueries({ queryKey: ['events'] })
    } catch {
      // silently ignore — already upvoted or network error
    } finally {
      setUpvoting(false)
    }
  }

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

        {/* Upvote button for community reports */}
        {event.sourceType === 'USER' && reportId && (
          <button
            onClick={handleUpvote}
            disabled={upvoted || upvoting}
            className={[
              'flex items-center gap-2 w-full rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              upvoted
                ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 cursor-default'
                : 'border-border hover:bg-accent cursor-pointer',
            ].join(' ')}
          >
            <ThumbsUp className="h-4 w-4" />
            {upvoted ? 'Upvoted — thanks!' : upvoting ? 'Upvoting…' : 'Upvote this report'}
          </button>
        )}

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

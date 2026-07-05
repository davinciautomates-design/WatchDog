/**
 * Returns a human-readable relative time string (e.g. "5m ago", "2h ago").
 * Used in event list items to show how recent an event is.
 */
export function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

/** Returns a short time string in local time, e.g. "02:45 PM". */
export function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Returns a date + time string, e.g. "Jun 20 at 02:45 PM". */
export function formatEventDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

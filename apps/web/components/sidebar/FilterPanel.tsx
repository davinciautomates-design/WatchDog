'use client'

import { CATEGORY_META } from '@watchdog/types'
import type { Category } from '@watchdog/types'
import { useFilters, ALL_CATEGORIES } from '@/store/filters'
import { clsx } from 'clsx'

interface FilterPanelProps {
  eventCount?: number
  isLoading?: boolean
}

export function FilterPanel({ eventCount, isLoading }: FilterPanelProps) {
  const { categories, toggleCategory, setAllCategories } = useFilters()
  const allOn = categories.length === ALL_CATEGORIES.length

  return (
    <div className="border-b border-border p-3 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filters
          </span>
          {eventCount != null && (
            <span className="text-xs text-muted-foreground">
              {isLoading && eventCount === 0
                ? <span className="inline-block w-8 h-3 rounded bg-muted animate-pulse align-middle" />
                : `· ${eventCount.toLocaleString()} shown`}
            </span>
          )}
        </div>
        <button
          onClick={() => setAllCategories(!allOn)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {allOn ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ALL_CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat]
          const active = categories.includes(cat)

          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={clsx(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all border',
                active
                  ? 'text-white border-transparent'
                  : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
              )}
              style={active ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
              aria-pressed={active}
            >
              {meta.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

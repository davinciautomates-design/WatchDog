import { clsx } from 'clsx'
import { CATEGORY_META } from '@watchdog/types'
import type { Category } from '@watchdog/types'

interface CategoryBadgeProps {
  category: Category
  size?: 'sm' | 'md'
  className?: string
}

export function CategoryBadge({ category, size = 'md', className }: CategoryBadgeProps) {
  const meta = CATEGORY_META[category]

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}
      style={{ backgroundColor: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
    >
      {meta.label}
    </span>
  )
}
